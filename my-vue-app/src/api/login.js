import request from '@/utils/request'

/**
 * 登录接口
 *
 */

/**
 * 是否使用「前端模拟登录」
 * true  = 前端 mock（后端没启动时用，测试账号 admin / 123456）
 * false = 调用真实后端接口 POST /login
 */
const USE_MOCK = false

// 供页面判断要不要显示「当前为前端模拟登录」的提示
export const isMockMode = () => USE_MOCK

/**
 * 登录
 * @param {{username: string, password: string}} data
 * @returns {Promise<{code:number, data:{token:string, username:string}}>}
 */
export const login = async (data) => {
  if (USE_MOCK) {
    // 模拟登录：固定账号 admin / 123456
    if (data.username === 'admin' && data.password === '123456') {
      return {
        code: 10000,
        data: {
          token: 'mock-token-' + Date.now(),
          username: data.username
        }
      }
    }
    // 抛出的 Error 没有 handled 标记，页面会自行弹窗提示
    throw new Error('账号或密码错误')
  }

  // 真实接口：/api/login 经 vite 代理转发到 http://localhost:3000/login
  // （拦截器已统一处理业务 code 与错误提示）
  return request.post('/login', data)
}

