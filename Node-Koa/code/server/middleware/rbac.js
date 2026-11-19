const { fail } = require('../utils/response')

/**
 * 权限校验（RBAC）中间件
 *
 * 用法：
 *   router.delete('/:id', auth, rbac(['admin']), User.remove)
 *
 * 前提：必须放在 auth 中间件之后，
 *      因为角色信息是 auth 从 JWT 里解析出来挂在 ctx.state.user 上的
 *
 * @param {Array} allowedRoles 允许访问的角色列表，比如 ['admin']
 */
const rbac = (allowedRoles) => {
    return async (ctx, next) => {
        // 1. 从 auth 中间件解析出的 ctx.state.user 里拿角色
        const user = ctx.state.user
        if (!user) {
            ctx.status = 401
            return fail(ctx, '未登录，请先登录', 40100)
        }

        // 2. 判断用户角色是否在允许列表里
        if (!allowedRoles.includes(user.role)) {
            ctx.status = 403   // 403 = 已登录但权限不够
            return fail(ctx, '权限不足，禁止访问', 40300)
        }

        // 3. 权限通过，放行
        await next()
    }
}

module.exports = rbac
