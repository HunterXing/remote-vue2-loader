import { compile as compileScss } from 'tiny-sass-compiler/dist/tiny-sass-compiler.esm-browser.prod.js'
import Babel from '@babel/standalone'

var scopeIndex = 0;

StyleContext.prototype = {

	withBase: function (callback) {

		var tmpBaseElt;
		if (this.component.baseURI) {

			// firefox and chrome need the <base> to be set while inserting or modifying <style> in a document.
			tmpBaseElt = document.createElement('base');
			tmpBaseElt.href = this.component.baseURI;

			var headElt = this.component.getHead();
			headElt.insertBefore(tmpBaseElt, headElt.firstChild);
		}

		callback.call(this);

		if (tmpBaseElt)
			this.component.getHead().removeChild(tmpBaseElt);
	},

	scopeStyles: function (styleElt, scopeName) {

		function process() {

			var sheet = styleElt.sheet;
			var rules = sheet.cssRules;

			for (var i = 0; i < rules.length; ++i) {

				var rule = rules[i];
				if (rule.type !== 1)
					continue;

				var scopedSelectors = [];

				rule.selectorText.split(/\s*,\s*/).forEach(function (sel) {

					scopedSelectors.push(scopeName + ' ' + sel);
					var segments = sel.match(/([^ :]+)(.+)?/);
					scopedSelectors.push(segments[1] + scopeName + (segments[2] || ''));
				});

				var scopedRule = scopedSelectors.join(',') + rule.cssText.substr(rule.selectorText.length);
				sheet.deleteRule(i);
				sheet.insertRule(scopedRule, i);
			}
		}

		try {
			// firefox may fail sheet.cssRules with InvalidAccessError
			process();
		} catch (ex) {

			if (ex instanceof DOMException && ex.code === DOMException.INVALID_ACCESS_ERR) {

				styleElt.sheet.disabled = true;
				styleElt.addEventListener('load', function onStyleLoaded() {

					styleElt.removeEventListener('load', onStyleLoaded);

					// firefox need this timeout otherwise we have to use document.importNode(style, true)
					setTimeout(function () {

						process();
						styleElt.sheet.disabled = false;
					});
				});
				return;
			}

			throw ex;
		}
	},

	compile: function () {

		var hasTemplate = this.template !== null;

		var scoped = this.elt.hasAttribute('scoped');

		if (scoped) {

			// no template, no scopable style needed
			if (!hasTemplate)
				return;

			// firefox does not tolerate this attribute
			this.elt.removeAttribute('scoped');
		}

		this.withBase(function () {

			this.component.getHead().appendChild(this.elt);
		});

		if (scoped)
			this.scopeStyles(this.elt, '[' + this.component.getScopeId() + ']');

		return Promise.resolve();
	},

	getContent: function () {
		var csstText = this.elt.textContent
		// 处理scss
		try {
			csstText = compileScss(csstText).code
		} catch (e) {
			console.error(e)
		}
		return csstText;
	},

	setContent: function (content) {

		this.withBase(function () {

			this.elt.textContent = content;
		});
	}
};

function StyleContext(component, elt) {

	this.component = component;
	this.elt = elt;
}


ScriptContext.prototype = {

	getContent: function () {
		// 处理script中的内容
		// 如果包含 export default 替换成 module.exports = ，否则浏览器无法解析
		if (this.elt.textContent.indexOf('export default') > -1) {
			this.elt.textContent = this.elt.textContent.replace('export default', 'module.exports =')
		}
		// 浏览器端解析es6，使用babel
		const es5Code = Babel.transform(this.elt.textContent, { presets: ['env'] }).code;
		console.log(es5Code);
		return es5Code;
	},

	setContent: function (content) {
		this.elt.textContent = content;
	},

	compile: function (module) {

		var childModuleRequire = function (childURL) {

			return remoteVueLoader.require(resolveURL(this.component.baseURI, childURL));
		}.bind(this);

		var childLoader = function (childURL, childName) {

			return remoteVueLoader(resolveURL(this.component.baseURI, childURL), childName);
		}.bind(this);

		try {
			Function('exports', 'require', 'remoteVueLoader', 'module', this.getContent()).call(this.module.exports, this.module.exports, childModuleRequire, childLoader, this.module);
		} catch (ex) {

			if (!('lineNumber' in ex)) {

				return Promise.reject(ex);
			}
			var vueFileData = responseText.replace(/\r?\n/g, '\n');
			var lineNumber = vueFileData.substr(0, vueFileData.indexOf(script)).split('\n').length + ex.lineNumber - 1;
			throw new (ex.constructor)(ex.message, url, lineNumber);
		}

		return Promise.resolve(this.module.exports)
			.then(remoteVueLoader.scriptExportsHandler.bind(this))
			.then(function (exports) {

				this.module.exports = exports;
			}.bind(this));
	}
};

function ScriptContext(component, elt) {

	this.component = component;
	this.elt = elt;
	this.module = { exports: {} };
}


TemplateContext.prototype = {

	getContent: function () {

		return this.elt.innerHTML;
	},

	setContent: function (content) {

		this.elt.innerHTML = content;
	},

	getRootElt: function () {

		var tplElt = this.elt.content || this.elt;

		if ('firstElementChild' in tplElt)
			return tplElt.firstElementChild;

		for (tplElt = tplElt.firstChild; tplElt !== null; tplElt = tplElt.nextSibling)
			if (tplElt.nodeType === Node.ELEMENT_NODE)
				return tplElt;

		return null;
	},

	compile: function () {

		return Promise.resolve();
	}
};

function TemplateContext(component, elt) {

	this.component = component;
	this.elt = elt;
}



Component.prototype = {

	getHead: function () {

		return document.head || document.getElementsByTagName('head')[0];
	},

	getScopeId: function () {

		if (this._scopeId === '') {

			this._scopeId = 'data-s-' + (scopeIndex++).toString(36);
			this.template.getRootElt().setAttribute(this._scopeId, '');
		}
		return this._scopeId;
	},

	load: function (componentURL) {

		return remoteVueLoader.httpRequest(componentURL)
			.then(function (responseText) {

				this.baseURI = componentURL.substr(0, componentURL.lastIndexOf('/') + 1);
				var doc = document.implementation.createHTMLDocument('');

				// IE requires the <base> to come with <style>
				doc.body.innerHTML = (this.baseURI ? '<base href="' + this.baseURI + '">' : '') + responseText;

				for (var it = doc.body.firstChild; it; it = it.nextSibling) {

					switch (it.nodeName) {
						case 'TEMPLATE':
							this.template = new TemplateContext(this, it);
							break;
						case 'SCRIPT':
							this.script = new ScriptContext(this, it);
							break;
						case 'STYLE':
							this.styles.push(new StyleContext(this, it));
							break;
					}
				}

				return this;
			}.bind(this));
	},

	_normalizeSection: function (eltCx) {

		var p;

		if (eltCx === null || !eltCx.elt.hasAttribute('src')) {

			p = Promise.resolve(null);
		} else {

			p = remoteVueLoader.httpRequest(eltCx.elt.getAttribute('src'))
				.then(function (content) {

					eltCx.elt.removeAttribute('src');
					return content;
				});
		}

		return p
			.then(function (content) {
				// css 和 scss 处理
				if (
					eltCx !== null &&
					eltCx.elt &&
					eltCx.elt.nodeName === 'STYLE'
				) {
				if (eltCx.elt.hasAttribute('lang')) {
					var lang = eltCx.elt.getAttribute('lang');
					eltCx.elt.removeAttribute('lang');
					return remoteVueLoader.langProcessor[lang.toLowerCase()].call(this, content === null ? eltCx.getContent() : content);
				}  else {
					return eltCx.getContent()
				}
			}
			return content;
			}.bind(this))
			.then(function (content) {

				if (content !== null)
					eltCx.setContent(content);
			});
	},

	normalize: function () {

		return Promise.all(Array.prototype.concat(
			this._normalizeSection(this.template),
			this._normalizeSection(this.script),
			this.styles.map(this._normalizeSection)
		))
			.then(function () {

				return this;
			}.bind(this));
	},

	compile: function () {

		return Promise.all(Array.prototype.concat(
			this.template && this.template.compile(),
			this.script && this.script.compile(),
			this.styles.map(function (style) { return style.compile(); })
		))
			.then(function () {

				return this;
			}.bind(this));
	}
};

function Component(name) {

	this.name = name;
	this.template = null;
	this.script = null;
	this.styles = [];
	this._scopeId = '';
}

function identity(value) {

	return value;
}

function parseComponentURL(url, name) {
	return {
		name,
		url
	};
}

function resolveURL(baseURL, url) {

	if (url.substr(0, 2) === './' || url.substr(0, 3) === '../') {
		return baseURL + url;
	}
	return url;
}


remoteVueLoader.load = function (url, name) {

	return function () {

		return new Component(name).load(url)
			.then(function (component) {

				return component.normalize();
			})
			.then(function (component) {

				return component.compile();
			})
			.then(function (component) {

				var exports = component.script !== null ? component.script.module.exports : {};

				if (component.template !== null)
					exports.template = component.template.getContent();

				if (exports.name === undefined)
					if (component.name !== undefined)
						exports.name = component.name;

				exports._baseURI = component.baseURI;

				return exports;
			});
	};
};



remoteVueLoader.require = function (moduleName) {

	return window[moduleName];
};

remoteVueLoader.httpRequest = function (url) {

	return new Promise(function (resolve, reject) {

		var xhr = new XMLHttpRequest();
		xhr.open('GET', url);
		xhr.responseType = 'text';

		xhr.onreadystatechange = function () {

			if (xhr.readyState === 4) {

				if (xhr.status >= 200 && xhr.status < 300)
					resolve(xhr.responseText);
				else
					reject(xhr.status);
			}
		};

		xhr.send(null);
	});
};

remoteVueLoader.langProcessor = {
	html: identity,
	js: identity,
	css: identity,
	scss: identity
};

remoteVueLoader.scriptExportsHandler = identity;

export default function remoteVueLoader(url, name) {
	var comp = parseComponentURL(url, name);
	return remoteVueLoader.load(comp.url, name);
}