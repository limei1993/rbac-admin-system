const { fail } = require('../utils/response')
const { getUserPerms } = require('../utils/permissions')

/**
 * 权限码校验（细粒度）中间件
 *
 * 用法：
 *   router.post('/', auth, perm('sys:user:create'), User.create)
 *   router.put('/:id', auth, perm(['sys:user:update', 'sys:user:edit']), User.update)
 *
 * 和 rbac 中间件的关系（两级权限，各管各的）：
 *   - rbac(['admin'])  → 角色级门槛，管「谁能进这个管理页面 / 用这套功能」
 *   - perm('sys:xxx')  → 权限码级门槛，管「谁能执行这个具体操作」
 *
 * 为什么要两级：
 *   只用角色，粒度太粗 —— 「能看用户列表」和「能删用户」被绑在一起，
 *   运营想给个只读账号时，只能把整个菜单关掉；
 *   只用权限码，页面级门槛就没人守了 —— 还得靠前端菜单拦，不可靠。
 *   两级叠加：rbac 守页面，perm 守操作。
 *
 * 关键设计：权限码也是【实时查库】的，不读 JWT 快照。
 *   管理员在「角色授权」页勾掉某个按钮，用户刷新页面按钮立刻消失，
 *   同时后端接口也开始拒绝 —— 前后端不会出现割裂。
 *
 * @param {string|string[]} required 需要的权限码，支持通配符（'sys:user:*'）
 */
const perm = (required) => {
    return async (ctx, next) => {
        // 1. 身份：必须先过 auth 中间件
        const user = ctx.state.user
        if (!user) {
            ctx.status = 401
            return fail(ctx, '未登录，请先登录', 40100)
        }

        // 2. 实时查这个用户当前拥有的权限码
        let granted = []
        try {
            granted = await getUserPerms(user.id)
        } catch (err) {
            // 查库失败必须「拒绝」而不是「放行」（fail closed）：
            // 权限校验属于安全边界，宁可报错也不能降级放行
            ctx.status = 500
            return fail(ctx, '权限校验失败，请稍后重试', 50000)
        }

        // 3. 比对：命中任意一个要求的权限码即放行
        const requiredList = Array.isArray(required) ? required : [required]
        const hit = requiredList.some(code => matchPerm(granted, code))
        if (!hit) {
            ctx.status = 403   // 403 = 已登录但权限不够
            return fail(ctx, '权限不足，禁止访问', 40300)
        }

        // 4. 权限通过，放行
        await next()
    }
}

/**
 * 权限码匹配
 *
 * 支持两种形式：
 *   - 精确匹配：'sys:user:create'
 *   - 前缀通配：'sys:user:*'  匹配 sys:user:create / sys:user:update / ...
 *
 * @param {string[]} granted 用户实际拥有的权限码
 * @param {string} required 要求的权限码
 */
const matchPerm = (granted, required) => {
    if (!required) return false
    if (granted.includes(required)) return true

    if (required.endsWith('*')) {
        const prefix = required.slice(0, -1)
        return granted.some(g => g.startsWith(prefix))
    }

    return false
}

module.exports = perm
