const Role = require('../models/role')
const UserRole = require('../models/userRole')
const { success } = require('../utils/response')
const AppError = require('../utils/AppError')

/**
 * GET /profile
 * 获取「当前登录账号」的实时身份与角色
 *
 * 为什么需要这个接口：
 *   1. JWT 里的 role 是登录那一刻的快照，管理员改完角色它不会自动更新
 *   2. 前端要按角色控制按钮（新增 / 编辑 / 删除），
 *      必须拿到实时角色，否则会出现「后端已经拒绝，前端还把按钮亮着」的割裂
 *   3. 和菜单模块保持同一套口径：角色一律实时查库（user_role → role）
 */
const getProfile = async (ctx) => {
    const user = ctx.state.user
    if (!user) {
        throw new AppError('未登录，请先登录', 401, 40100)
    }

    // 1. user_id → user_role → role_id
    const links = await UserRole.findAll({ where: { userId: user.id } })
    const roleIds = links.map(l => l.roleId)

    // 2. role_id → role（一个用户可以有多个角色）
    let roles = []
    if (roleIds.length) {
        const rows = await Role.findAll({ where: { id: roleIds } })
        roles = rows.map(r => ({
            id: r.id,
            name: r.name,
            description: r.description || ''
        }))
    }

    success(ctx, {
        id: user.id,
        username: user.username,
        // 角色名数组：前端用 roles.includes('admin') 判断是不是管理员
        roles: roles.map(r => r.name),
        roleDetails: roles
    })
}

module.exports = {
    getProfile
}
