const { fail } = require('../utils/response')
const Role = require('../models/role')
const UserRole = require('../models/userRole')

/**
 * 权限校验（RBAC）中间件
 *
 * 用法：
 *   router.delete('/:id', auth, rbac(['admin']), User.remove)
 *
 * 前提：必须放在 auth 中间件之后，
 *      因为用户身份是 auth 从 JWT 里解析出来挂在 ctx.state.user 上的
 *
 * 关键设计：角色【实时查库】，不读 JWT 里的 role 快照
 *   - 早期版本直接读 ctx.state.user.role（登录那一刻的快照），
 *     管理员在「角色授权」里把某个用户降级后，这个用户的旧 token
 *     还能继续用管理员权限，直到 token 过期为止 —— 这是真实的越权漏洞
 *   - 现在改成 user_id → user_role → role 实时查，
 *     和菜单模块（controller/menu.js）保持同一套口径：
 *     管理员改完权限，用户刷新页面立刻生效，不用等 token 过期
 *   - 一个用户可以有多个角色，这里取并集（命中任意一个允许的角色即放行）
 *
 * @param {Array} allowedRoles 允许访问的角色列表，比如 ['admin']
 */
const rbac = (allowedRoles) => {
    return async (ctx, next) => {
        // 1. 从 auth 中间件解析出的 ctx.state.user 里拿用户 id
        const user = ctx.state.user
        if (!user) {
            ctx.status = 401
            return fail(ctx, '未登录，请先登录', 40100)
        }

        // 2. 实时查这个用户当前拥有的角色
        let roleNames = []
        try {
            const links = await UserRole.findAll({ where: { userId: user.id } })
            const roleIds = links.map(l => l.roleId)
            if (roleIds.length) {
                const roles = await Role.findAll({ where: { id: roleIds } })
                roleNames = roles.map(r => r.name)
            }
        } catch (err) {
            // 查库失败必须「拒绝」而不是「放行」（fail closed）：
            // 权限校验属于安全边界，宁可报错也不能降级放行
            ctx.status = 500
            return fail(ctx, '权限校验失败，请稍后重试', 50000)
        }

        // 3. 多角色取并集：命中任意一个允许的角色就放行
        if (!roleNames.some(name => allowedRoles.includes(name))) {
            ctx.status = 403   // 403 = 已登录但权限不够
            return fail(ctx, '权限不足，禁止访问', 40300)
        }

        // 4. 权限通过，放行
        await next()
    }
}

module.exports = rbac
