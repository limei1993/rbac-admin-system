import request from '@/utils/request'

/**
 * 注册接口
 *
 * 后端 POST /register：自助注册，角色由服务端写死为「普通用户」，
 * 所以前端不传 role 字段（传了后端也不会读）。
 *
 * 路径不带 /api 前缀，由 request.js 的 baseURL 统一拼接，
 * 再经 vite 代理转发到 http://localhost:3000/register
 *
 * @param {{username: string, password: string, nickname?: string}} data
 * @returns {Promise<{code:number, data:{token:string, username:string, nickname:string, role:string}}>}
 */
export const register = (data) => {
  return request.post('/register', data)
}
