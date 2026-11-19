import axios from 'axios'
import { ElMessage } from 'element-plus'

/**
 * axios 二次封装
 *
 * 统一处理：
 *   1. baseURL —— 开发环境走 vite 代理（/api -> http://localhost:3000）
 *   2. 请求拦截器 —— 注入 token、过滤空查询参数、统一超时
 *   3. 响应拦截器 —— 统一业务 code 校验 + 统一错误提示
 *
 * 用法：
 *   import request from '@/utils/request'
 *   const res = await request.get('/users', { params: { page: 1 } })
 *   // res 就是后端返回的业务对象 { code, data, msg }
 */

// 后端的业务成功码：列表/新增返回 200，更新/删除返回 10000，都视为成功
const SUCCESS_CODES = [200, 10000]

const request = axios.create({
  // 开发环境默认 /api，由 vite.config.js 里的 proxy 转发到后端并去掉 /api 前缀
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json;charset=utf-8'
  }
})

/**
 * 请求拦截器
 */
request.interceptors.request.use(
  config => {
    // 1. 统一注入 token（后续接登录功能时直接可用）
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // 2. 过滤掉值为空的查询参数，避免拼出 ?name=&page=
    if (config.params) {
      config.params = Object.fromEntries(
        Object.entries(config.params).filter(
          ([, value]) => value !== '' && value !== null && value !== undefined
        )
      )
    }

    return config
  },
  error => Promise.reject(error)
)

/**
 * 响应拦截器
 */
request.interceptors.response.use(
  response => {
    const res = response.data

    // 带 code 字段的才是业务响应，需要校验业务码
    if (res && typeof res === 'object' && 'code' in res) {
      if (!SUCCESS_CODES.includes(res.code)) {
        const msg = res.msg || res.data || '操作失败'
        ElMessage.error(msg)
        // handled 标记：告诉调用方错误已提示过，页面不要再弹一次
        const error = new Error(msg)
        error.handled = true
        return Promise.reject(error)
      }
    }

    // 直接返回业务数据，页面里不用再写 res.data.data
    return res
  },
  error => {
    // 统一处理 HTTP 层面的错误
    let msg = '网络异常，请稍后重试'

    if (error.code === 'ECONNABORTED') {
      msg = '请求超时，请检查网络或后端服务'
    } else if (error.response) {
      const status = error.response.status
      const statusText = {
        400: '请求参数有误',
        401: '登录已过期，请重新登录',
        403: '没有访问权限',
        404: '请求的接口不存在',
        500: '服务器内部错误'
      }
      msg = error.response.data?.msg || statusText[status] || `请求失败（${status}）`

      // 401：登录态已失效（token 过期 / 被伪造），清掉本地 token 并跳回登录页
      if (status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('username')
        localStorage.removeItem('role')
        localStorage.removeItem('roles')
        const redirect = window.location.hash.replace(/^#/, '')
        if (!redirect.startsWith('/login')) {
          window.location.hash = `/login?redirect=${encodeURIComponent(redirect)}`
        }
      }
    } else if (error.request) {
      msg = '无法连接到服务器，请确认后端已启动'
    }

    ElMessage.error(msg)
    error.handled = true
    return Promise.reject(error)
  }
)

export default request
