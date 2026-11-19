import request from '@/utils/request'

/**
 * 菜单接口
 *
 * 后端菜单模块（server/routes/menus.js）提供 4 个接口：
 *   GET  /menus            当前登录用户可见的菜单树（所有登录用户都能调）
 *   GET  /menus/all        全部菜单（角色授权页用，仅 admin）
 *   GET  /menus/roles      角色列表 + 各角色已授权的菜单 ID（仅 admin）
 *   PUT  /menus/roles/:id  给角色分配菜单（仅 admin）
 *
 * 路径不带 /api 前缀，由 request.js 的 baseURL 统一拼接，
 * 再经 vite 代理转发到 http://localhost:3000
 */

/**
 * 获取当前登录用户的菜单树
 * @returns {Promise<{code:number, data:Array<MenuNode>>}>}
 *   MenuNode: { id, parentId, name, path, icon, sort, visible, children }
 */
export const getUserMenus = () => {
  return request.get('/menus')
}

/**
 * 获取全部菜单（不分角色），给角色授权页用
 * @returns {Promise<{code:number, data:Array<MenuNode>>}>}
 */
export const getAllMenus = () => {
  return request.get('/menus/all')
}

/**
 * 获取角色列表及各角色已授权的菜单 ID
 * @returns {Promise<{code:number, data:Array<{id:number,name:string,description:string,menuIds:number[]}>>}>}
 */
export const getRoleMenus = () => {
  return request.get('/menus/roles')
}

/**
 * 给角色分配菜单（先删后插，全量覆盖）
 * @param {number} roleId
 * @param {number[]} menuIds 菜单 ID 数组
 */
export const assignRoleMenus = (roleId, menuIds) => {
  return request.put(`/menus/roles/${roleId}`, { menuIds })
}

/**
 * 新增菜单
 * @param {{name:string, path:string, icon?:string, parentId?:number, sort?:number, visible?:boolean}} data
 */
export const createMenu = (data) => {
  return request.post('/menus', data)
}

/**
 * 修改菜单
 *
 * 后端用 Joi 校验，body 里不允许出现 schema 之外的字段（如 id），
 *      所以这里把 id 拆出来放进 URL，body 只留真正要修改的字段
 * @param {{id:number, name?:string, path?:string, icon?:string, parentId?:number, sort?:number, visible?:boolean}} data
 */
export const updateMenu = (data) => {
  const { id, ...fields } = data
  return request.put(`/menus/${id}`, fields)
}

/**
 * 删除菜单（后端会级联删除子菜单和对应的角色授权记录）
 * @param {number} id
 */
export const deleteMenu = (id) => {
  return request.delete(`/menus/${id}`)
}
