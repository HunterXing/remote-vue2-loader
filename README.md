# remote-vue2-loader

### 描述
在vue2 单页面中加载远程组件，兼容scss，支持浏览器端es6语法降级
> 修改自 http-vue-loader，解决了浏览器端es6语法降级问题、scss样式问题、以及export default {} 语法问题
### 安装

```bash
npm install remote-vue2-loader

```

### 使用

```javascript

<template>
  <component :is="remoteComponent"></component>
</template>

<script>
import remoteVueLoader from 'remote-vue2-loader'
export default {
  data () {
    return {
      remoteComponent: null
    }
  },
  created () {
    this.getRemoteComponent()
  },
  methods: {
    // 尝试渲染远程文件或远程字符串
    async getRemoteComponent() {
      // 从远程服务器加载组件
      this.remoteComponent = remoteVueLoader('127.0.0.1/testA.vue')
    }
  }
}
</script>

```

### 说明
上述远程的testA.vue文件内容可能如下：
``` javascript
<template>
  <component :is="remoteComponent"></component>
</template>

<script>
import remoteVueLoader from 'remote-vue2-loader'
export default {
  data () {
    return {
      remoteComponent: null
    }
  },
  created () {
    this.getRemoteComponent()
  },
  methods: {
    // 尝试渲染远程文件或远程字符串
    async getRemoteComponent() {
      // 情况1. 直接从从远程服务器加载组件
      this.remoteComponent = remoteVueLoader('127.0.0.1/testA.vue')
      
      // 情况2. 如果接口是post等其他类型接口，或者需要添加参数，也可以这么写
      axios.get('http://127.0.0.1/testA.vue', {
        params: {
          p1: 'xxx',
          p2: 'xxx'
        }
      }).then(res => {
        this.remoteComponent = remoteVueLoader('data:text/plain,' + encodeURIComponent(res.data))
      })
    }
  }
}
```






