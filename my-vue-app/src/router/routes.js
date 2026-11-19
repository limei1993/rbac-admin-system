/**
 * 路由表（单一数据源）
 *
 * 为什么单独拆一个文件：
 *  1. router/index.js 用它来创建路由实例
 *  2. 菜单管理页要用它生成「菜单路径」的下拉选项
 *     —— 保证菜单里的 path 一定对应一个真实存在的前端路由，
 *        否则用户点菜单会进到一个没有对应组件的空白页
 *
 * 注意：路由是静态注册的，后端只负责「哪些菜单可见」，
 *      两者靠 path 一一对应（菜单管理页里的路径下拉就是从这里生成的）
 */

export const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/Register.vue'),
    meta: { title: '注册' }
  },
  {
    path: '/',
    component: () => import('@/views/Main.vue'),
    // 注意：这里不能写 redirect: '/home'，
    // 因为路由表里根本没有 /home 这条路由（首页是 path: '' 的子路由，完整路径就是 '/'）
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/views/Home.vue'),
        meta: { title: '首页' }
      },
      {
        path: 'goods',
        name: 'goods',
        component: () => import('@/views/Goods.vue'),
        meta: { title: '商品管理' }
      },
      {
        path: 'user',
        name: 'user',
        component: () => import('@/views/User.vue'),
        meta: { title: '用户管理' }
      },
      {
        path: 'other',
        name: 'other',
        component: () => import('@/views/Other.vue'),
        meta: { title: '其他' }
      },
      {
        path: 'other/goods-list',
        name: 'otherGoodsList',
        component: () => import('@/views/Goods.vue'),
        meta: { title: '商品列表' }
      },
      {
        path: 'other/category-list',
        name: 'otherCategoryList',
        component: () => import('@/views/Category.vue'),
        meta: { title: '分类展示' }
      },
      {
        // 角色菜单授权页（只有 admin 能在菜单里看到并进入）
        path: 'menu-auth',
        name: 'menuAuth',
        component: () => import('@/views/MenuAuth.vue'),
        meta: { title: '角色授权' }
      },
      {
        // 菜单管理页（增删改菜单表本身）
        path: 'menu-manage',
        name: 'menuManage',
        component: () => import('@/views/MenuManage.vue'),
        meta: { title: '菜单管理' }
      }
    ]
  }
]

/**
 * 从路由表里提取「可以做成菜单」的路径
 *
 * 规则：
 *  1. 只取有 meta.title 的叶子路由（父路由本身只是布局，不做成菜单）
 *  2. 排除 /login、/register（这两个是公开页面，不属于后台菜单）
 *  3. 子路由的完整路径 = 父路径 + 子路径
 */
export const menuPathOptions = (() => {
  const options = []

  const walk = (list, parentPath = '') => {
    list.forEach((route) => {
      // 绝对路径直接用，相对路径拼在父路径后面
      const fullPath = route.path.startsWith('/')
        ? route.path
        : `${parentPath}/${route.path}`.replace(/\/{2,}/g, '/')

      if (route.children && route.children.length) {
        // 父路径 '/' 的子路由拼出来是 '/xxx'，所以传 '' 而不是 '/'
        walk(route.children, fullPath === '/' ? '' : fullPath)
        return
      }

      const isPublic = ['/login', '/register'].includes(fullPath)
      if (!route.meta || !route.meta.title || isPublic) return

      // 去掉结尾多余的 '/'，根路径保持 '/'
      const path = fullPath.replace(/\/+$/, '') || '/'
      options.push({ path, label: route.meta.title })
    })
  }

  walk(routes)

  return options
})()
