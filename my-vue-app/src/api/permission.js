import request from '@/utils/request'

/**
 * 权限码接口
 *
 * 后端权限模块（server/routes/permissions.js）提供 1 个接口：
 *   GET /permissions   当前登录用户拥有的权限码数组
 *
 * 权限码和角色一样是【实时】的：管理员在「角色授权」页勾掉一个按钮，
 * 用户刷新页面后按钮立刻消失，后端接口同步开始拒绝。
 */
export const getPermissions = () => {
  return request.get('/permissions')
}
