import { createApp } from 'vue'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import '@/assets/less/index.less'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router).mount('#app')
// 全局注册所有 Element Plus 图标组件
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}