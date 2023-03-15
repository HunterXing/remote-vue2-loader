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
  <div class="test-wrap">
    <p>{{ message }}</p>
    <el-button @click="test" type="primary">按钮测试</el-button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      message: 'Hello, world!'
    }
  },
  methods: {
    test() {
      // 此处的es6语法会自动被babel降级
      const tip = 'tip'
      alert(tip)
    }
  }
}
</script>
<style lang="scss">
.test-wrap {
  p {
    color: #ff0;
  }
}
</style>
```






