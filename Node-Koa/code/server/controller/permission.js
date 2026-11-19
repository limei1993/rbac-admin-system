const { success } = require('../utils/response')
const AppError = require('../utils/AppError')
const { getUserPerms } = require('../utils/permissions')

/**
 * GET /permissions
 * 获取「当前登录账号」拥有的权限码列表
 *
 * 为什么需要这个接口：
 *   1. 前端要用权限码控制按钮显隐（新增 / 编辑 / 删除），
 *      必须拿到和后端鉴权完全一致的那一份权限码
 *   2. 权限码和角色一样是【实时】的 —— 管理员在「角色授权」页勾掉一个按钮，
 *      用户刷新页面按钮立刻消失，后端接口同步开始拒绝
 *   3. 权限码不进 JWT：JWT 是自包含的，签发那一刻的内容就固化了，
 *      放进去就会变成「登录快照」，降权不生效
 */
const getPermissions = async (ctx) => {
    const user = ctx.state.user
    if (!user) {
        throw new AppError('未登录，请先登录', 401, 40100)
    }

    const perms = await getUserPerms(user.id)
    success(ctx, perms)
}

module.exports = {
    getPermissions
}
