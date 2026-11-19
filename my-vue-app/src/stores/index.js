import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getUserMenus } from '@/api/menu'
function initState() {
    return {
        // 侧边栏是否折叠。
        // 注意：这里必须叫 isCollapse（不带 d），
        // 因为 CommonAside.vue / CommonHeader.vue 读的都是 store.state.isCollapse
        isCollapse: true,
    }
}
export const useAllDataStore = defineStore('allData', () => {
  const state = ref(initState())
  return {
    state
  }
})

// 登录态：token、用户名、角色持久化到 localStorage，刷新页面不丢失
export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const username = ref(localStorage.getItem('username') || '')
  // 角色来自后端下发的 JWT payload，用于前端做菜单/按钮级别的展示控制
  const role = ref(localStorage.getItem('role') || '')

  // 保存登录态
  const setLogin = (newToken, newUsername, newRole) => {
    token.value = newToken || ''
    username.value = newUsername || ''
    role.value = newRole || ''
    if (newToken) {
      localStorage.setItem('token', newToken)
      localStorage.setItem('username', newUsername || '')
      if (newRole) {
        localStorage.setItem('role', newRole)
      } else {
        // 老登录接口可能没返回 role，避免残留上一个账号的角色
        localStorage.removeItem('role')
      }
    }
  }

  // 退出登录
  const logout = () => {
    token.value = ''
    username.value = ''
    role.value = ''
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('role')
  }

  // 是否管理员：用于前端隐藏「删除」等管理员专属按钮
  // 注意：真正的权限边界在后端 rbac 中间件，前端只是展示层优化
  const isAdmin = computed(() => role.value === 'admin')

  return {
      token,
      username,
      role,
      isAdmin,
      setLogin,
      logout
  }
  })

  /**
  * 菜单 Store
  *
  * 设计要点：
  *  1. 菜单由后端按「当前用户的角色」下发，前端只负责渲染
  *  2. loaded 标记：菜单只在登录后拉一次，路由跳转不再重复请求
  *  3. paths 集合：给路由守卫做「这个路径我有没有权限」的判断
  *  4. resetMenus：退出登录 / 切换账号时清空，避免上一个账号的菜单残留
  */
  export const useMenuStore = defineStore('menu', () => {
  // 后端返回的菜单树
  const menus = ref([])
  // 是否已经拉过菜单（避免重复请求）
  const loaded = ref(false)
  // 正在加载中（防止并发重复请求）
  const loading = ref(false)
  // 加载失败时的错误信息
  const error = ref(null)

  /**
   * 拉取当前用户的菜单
   * @param {boolean} force 传 true 强制重新拉取
   */
  const loadMenus = async (force = false) => {
      // 已经拉过且不强制刷新 → 直接用缓存
      if (loaded.value && !force) return menus.value
      // 正在加载中 → 直接返回当前值，不重复发请求
      if (loading.value) return menus.value

      loading.value = true
      error.value = null
      try {
          const res = await getUserMenus()
          menus.value = Array.isArray(res.data) ? res.data : []
          loaded.value = true
      } catch (e) {
          error.value = e.message || '菜单加载失败'
          menus.value = []
          loaded.value = true
          throw e
      } finally {
          loading.value = false
      }
  }

  /**
   * 重置菜单状态（退出登录 / 切换账号时调用）
   */
  const resetMenus = () => {
      menus.value = []
      loaded.value = false
      loading.value = false
      error.value = null
  }

  /**
   * 把树形菜单拍平成一维数组
   */
  const flatMenus = computed(() => {
      const result = []
      const walk = (list) => {
          list.forEach(item => {
              result.push(item)
              if (item.children && item.children.length) {
                  walk(item.children)
              }
          })
      }
      walk(menus.value)
      return result
  })

  /**
   * 当前用户有权限的所有路径（Set，查找是 O(1)）
   */
  const paths = computed(() => new Set(flatMenus.value.map(item => item.path)))

  /**
   * 判断某个路径当前用户是否有权限访问
   * @param {string} path
   */
  const hasPermission = (path) => paths.value.has(path)

  return {
      menus,
      loaded,
      loading,
      error,
      loadMenus,
      resetMenus,
      flatMenus,
      paths,
      hasPermission
  }
  })