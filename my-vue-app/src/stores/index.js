import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getUserMenus } from '@/api/menu'
import { getProfile } from '@/api/user'
import { getPermissions } from '@/api/permission'
// 从 localStorage 读回角色数组（存的是 JSON 字符串）
// 容错：数据被手改坏时返回空数组，不能让整个应用白屏
const readStoredRoles = () => {
    try {
        const raw = localStorage.getItem('roles')
        const parsed = raw ? JSON.parse(raw) : []
        return Array.isArray(parsed) ? parsed : []
    } catch (e) {
        return []
    }
}

// 权限码同样从 localStorage 读一份缓存：
//   作用是「刷新页面时按钮立刻显示」，不用等 /permissions 请求回来再显示，避免闪烁。
//   真正的权威值仍然来自 loadPerms() 的实时查询，缓存只是首屏兜底。
const readStoredPerms = () => {
    try {
        const raw = localStorage.getItem('perms')
        const parsed = raw ? JSON.parse(raw) : []
        return Array.isArray(parsed) ? parsed : []
    } catch (e) {
        return []
    }
}

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
    // role  : 登录那一刻的角色快照（单个），只做展示兼容用
    // roles : 实时角色数组，权限判断一律以它为准
    //        （后端 rbac 中间件是实时查库的，前端必须跟同一套口径）
    const role = ref(localStorage.getItem('role') || '')
    const roles = ref(readStoredRoles())
    // 实时角色是否已加载成功（和菜单的 loaded 一个套路）
    // 单独标记是为了让路由守卫能判断「菜单拿到了但角色没拿到」这种情况，
    // 从而触发重试，而不是因为菜单已加载就整体跳过
    const rolesLoaded = ref(false)
    const rolesLoading = ref(false)
    // 权限码：细粒度权限（如 sys:user:create），按钮显隐完全以它为准
    // 和 roles 一样是「实时」的 —— 管理员在角色授权页勾掉按钮，用户刷新即生效
    const perms = ref(readStoredPerms())
    const permsLoaded = ref(false)
    const permsLoading = ref(false)

    // 持久化角色数组
    const persistRoles = (list) => {
        roles.value = Array.isArray(list) ? list : []
        if (roles.value.length) {
            localStorage.setItem('roles', JSON.stringify(roles.value))
        } else {
            localStorage.removeItem('roles')
        }
    }

    // 保存登录态
    const setLogin = (newToken, newUsername, newRole, newRoles) => {
        token.value = newToken || ''
        username.value = newUsername || ''
        role.value = newRole || ''
        // 后端登录接口现在会返回 roles 数组；老接口没返回时用单个 role 兜底
        persistRoles(newRoles || (newRole ? [newRole] : []))
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

    // 刷新实时角色：管理员改完权限后，用户刷新页面即可生效
    // 失败时【不】置 rolesLoaded —— 保持 false，路由守卫下次会再拉一次，
    // 避免「一次网络抖动导致整个会话里管理员按钮永久消失」
    const loadRoles = async (force = false) => {
        if (rolesLoaded.value && !force) return roles.value
        if (rolesLoading.value) return roles.value

        rolesLoading.value = true
        try {
            const res = await getProfile()
            const list = res.data?.roles || []
            persistRoles(list)
            rolesLoaded.value = true
            return list
        } finally {
            rolesLoading.value = false
        }
    }

    // 刷新实时权限码：管理员在「角色授权」页改完按钮权限，用户刷新页面即可生效
    // 失败时【不】置 permsLoaded —— 保持 false，路由守卫下次会再拉一次，
    // 避免「一次网络抖动导致整个会话里按钮永久消失」
    const loadPerms = async (force = false) => {
        if (permsLoaded.value && !force) return perms.value
        if (permsLoading.value) return perms.value

        permsLoading.value = true
        try {
            const res = await getPermissions()
            const list = Array.isArray(res.data) ? res.data : []
            perms.value = list
            if (list.length) {
                localStorage.setItem('perms', JSON.stringify(list))
            } else {
                localStorage.removeItem('perms')
            }
            permsLoaded.value = true
            return list
        } finally {
            permsLoading.value = false
        }
    }

    // 是否拥有某个权限码
    // 数组形式是「命中任意一个即通过」（OR）
    // 支持通配：'sys:user:*' 匹配 sys:user:create / sys:user:update 等
    const hasPerm = (code) => {
        if (!code) return true
        const list = Array.isArray(code) ? code : [code]
        return list.some((c) => {
            if (perms.value.includes(c)) return true
            if (typeof c === 'string' && c.endsWith('*')) {
                const prefix = c.slice(0, -1)
                return perms.value.some((p) => p.startsWith(prefix))
            }
            return false
        })
    }

    // 退出登录
    const logout = () => {
        token.value = ''
        username.value = ''
        role.value = ''
        roles.value = []
        rolesLoaded.value = false
        rolesLoading.value = false
        perms.value = []
        permsLoaded.value = false
        permsLoading.value = false
        localStorage.removeItem('token')
        localStorage.removeItem('username')
        localStorage.removeItem('role')
        localStorage.removeItem('roles')
        localStorage.removeItem('perms')
    }

    // 是否管理员：只看实时角色数组
    // 刻意不拿 role 快照兜底 —— 快照是登录那一刻的，
    // 管理员降权后快照不会变，用它判断会导致降权不生效
    const isAdmin = computed(() => roles.value.includes('admin'))

    return {
        token,
        username,
        role,
        roles,
        rolesLoaded,
        perms,
        permsLoaded,
        isAdmin,
        hasPerm,
        setLogin,
        loadRoles,
        loadPerms,
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