import { createRouter, createWebHashHistory } from 'vue-router'
import { useMenuStore, useUserStore } from '@/stores'
import { routes } from './routes'

// 路由表定义在 ./routes.js，菜单管理页也会用它生成「菜单路径」下拉选项

const router = createRouter({
  // 设置路由模式
  history: createWebHashHistory(),
  routes
})

// 全局前置守卫：设置页面标题 + 登录校验 + 菜单权限校验
router.beforeEach(async (to) => {
  document.title = to.meta.title ? `${to.meta.title} - 通用后台管理系统` : '通用后台管理系统'

  // 直接读 localStorage：request.js 在收到 401 时会清掉 token，
  // 这里能立即感知到登录态已失效（不依赖 pinia 内存里的 ref 是否刷新）
  const isLogin = !!localStorage.getItem('token')

  // 已登录还访问登录页 → 直接回首页
  if (to.path === '/login') {
    return isLogin ? '/' : true
  }

  // 注册页是公开页面，未登录也能访问
  // （不放行的话会被下面「未登录 → 跳登录页」的规则拦回去，注册页永远进不去）
  if (to.path === '/register') {
    return true
  }

  // 未登录访问其他页面 → 跳登录页，并记住原本要去的地址
  if (!isLogin) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // ===== 菜单权限校验 =====
  // 菜单由后端按当前用户的角色下发，这里判断「这个路径在不在我的菜单里」
  const menuStore = useMenuStore()
  // 用户角色：决定页面里哪些操作按钮该亮着
  const userStore = useUserStore()

  // 第一次进来（或刚换了账号）时拉一次菜单 + 实时角色，之后走缓存
  // 两个接口并行：菜单决定「能进哪些页面」，角色决定「能操作哪些按钮」
  // 刷新页面时 store 会重置 → 这里必然重新拉，
  // 所以管理员改完权限，用户刷新一下就立刻生效，不用重新登录
  //
  // 判据是【或】不是【与】：菜单和角色是两个独立的 store。
  // 之前只判断 menuStore.loaded，一旦 loadRoles 单独失败（比如 /profile 500），
  // menuStore.loaded 已经被置为 true，之后所有导航都会跳过这一段，
  // isAdmin 永远是 false（后端照常放行，但界面和后端割裂），只能靠手动刷新页面恢复。
  // 现在任意一项没加载成功都会重新拉，没成功的那项自然被重试。
  if (!menuStore.loaded || !userStore.rolesLoaded) {
    try {
      await Promise.all([
        menuStore.loadMenus(),
        userStore.loadRoles()
      ])
    } catch (e) {
      // 加载失败不阻塞跳转，侧边栏会显示「加载失败 + 重试」
      console.warn('菜单/角色加载失败：', e.message)
    }
  }

  // 首页永远放行。
  // 否则会出现「没权限 → 跳首页 → 首页也没权限 → 再跳首页」的死循环
  if (to.path === '/') {
    return true
  }

  // 路径不在当前角色的菜单里 → 视为无权限，踢回首页
  if (!menuStore.hasPermission(to.path)) {
    console.warn(`无访问权限，已跳回首页：${to.path}`)
    return { path: '/' }
  }

  return true
})

export default router
