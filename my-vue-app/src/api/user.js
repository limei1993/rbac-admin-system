import request from '@/utils/request'

/**
 * 用户管理相关接口
 *
 * 路径不带 /api 前缀，由 request.js 的 baseURL 统一拼接
 * 后端已改造为 RESTful 规范：
 *   GET    /users        列表（分页 / 搜索）
 *   POST   /users        新增
 *   PUT    /users/:id    修改
 *   DELETE /users/:id    删除
 */

/**
 * 获取用户列表（服务端分页 + 姓名模糊搜索）
 * @param {{page?:number, pagesize?:number, name?:string}} params
 */
export const getUsers = (params) => {
  return request.get('/users', { params })
}

/**
 * 新增用户
 * @param {{name:string, age:number, sexlabel:string, birth:string, addr:string}} data
 */
export const addUser = (data) => {
  return request.post('/users', data)
}

/**
 * 编辑用户
 *
 * 注意：后端用 Joi 校验，body 里不允许出现 schema 之外的字段（如 id），
 *      所以这里把 id 拆出来放进 URL，body 只留真正要修改的字段
 */
export const updateUser = (data) => {
  const { id, ...fields } = data
  return request.put(`/users/${id}`, fields)
}

/**
 * 删除用户
 * @param {number} id
 */
export const deleteUser = (id) => {
  return request.delete(`/users/${id}`)
}

/**
 * 获取当前登录账号的实时身份与角色
 *
 * 后端 rbac 中间件是实时查库的，所以前端也必须拿实时角色，
 * 否则会出现「后端已经 403，前端还把按钮亮着」的割裂。
 */
export const getProfile = () => {
  return request.get('/profile')
}
