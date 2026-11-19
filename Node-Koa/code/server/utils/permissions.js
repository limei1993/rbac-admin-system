const { Op } = require('sequelize')
const Menu = require('../models/menu')
const Role = require('../models/role')
const RoleMenu = require('../models/roleMenu')
const UserRole = require('../models/userRole')

/**
 * 权限查询公共层
 *
 * 把「当前用户有哪些角色」「当前用户有哪些权限码」这两件事收敛到一处，
 * 避免 rbac 中间件和 perm 中间件各写一套查库逻辑，口径不一致。
 *
 * 设计要点：
 *  1. 全部实时查库，不读 JWT 里的快照 —— 管理员改完权限，用户刷新即生效
 *  2. 一个用户可以有多个角色，角色之间取【并集】
 *  3. 权限码来自菜单表里 type = 'button' 的那些行，
 *     按钮挂在对应页面菜单下，通过 role_menu 一起授权，
 *     所以「授权按钮」和「授权菜单」是同一张关联表，不需要额外的权限表
 */

/**
 * 用户 → 角色 ID 集合
 * @param {number} userId
 * @returns {Promise<number[]>}
 */
const getUserRoleIds = async (userId) => {
    const links = await UserRole.findAll({
        where: { userId },
        attributes: ['roleId']
    })
    return [...new Set(links.map(l => l.roleId))]
}

/**
 * 用户 → 角色名集合
 * @param {number} userId
 * @returns {Promise<string[]>}
 */
const getUserRoleNames = async (userId) => {
    const roleIds = await getUserRoleIds(userId)
    if (!roleIds.length) return []

    const roles = await Role.findAll({
        where: { id: { [Op.in]: roleIds } },
        attributes: ['name']
    })
    return roles.map(r => r.name)
}

/**
 * 用户 → 权限码集合
 *
 * 只取 type = 'button' 且 perm 非空的菜单行。
 * 这些行同时也会出现在「角色授权」页的树里（管理员能勾选），
 * 但不会出现在侧边栏（那是 GET /menus 负责过滤的）。
 *
 * @param {number} userId
 * @returns {Promise<string[]>}
 */
const getUserPerms = async (userId) => {
    const roleIds = await getUserRoleIds(userId)
    if (!roleIds.length) return []

    const roleMenus = await RoleMenu.findAll({
        where: { roleId: { [Op.in]: roleIds } },
        attributes: ['menuId']
    })
    const menuIds = [...new Set(roleMenus.map(r => r.menuId))]
    if (!menuIds.length) return []

    const rows = await Menu.findAll({
        where: {
            id: { [Op.in]: menuIds },
            type: 'button'
        },
        attributes: ['perm']
    })

    return rows.map(r => r.perm).filter(Boolean)
}

module.exports = {
    getUserRoleIds,
    getUserRoleNames,
    getUserPerms
}
