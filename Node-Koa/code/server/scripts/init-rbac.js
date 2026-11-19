const Role = require('../models/role')
const UserRole = require('../models/userRole')
const Admin = require('../models/admin')

/**
 * 初始化 RBAC 数据：
 *   1. 创建角色（admin / user）
 *   2. 把 admin 账号绑定到 admin 角色
 *
 * 运行：node scripts/init-rbac.js
 */
const run = async () => {
    // 1. 创建角色（已存在则跳过）
    const roleList = [
        { name: 'admin', description: '超级管理员：可删除用户' },
        { name: 'user', description: '普通用户：只能查看和新增' }
    ]

    for (const r of roleList) {
        const [role] = await Role.findOrCreate({
            where: { name: r.name },
            defaults: r
        })
        console.log(`角色就绪：${role.name} (id=${role.id})`)
    }

    // 2. 找到 admin 账号
    const admin = await Admin.findOne({ where: { username: 'admin' } })
    if (!admin) {
        console.log('没有找到 admin 账号，请先执行：node scripts/init-admin.js')
        process.exit(1)
    }

    // 3. 把 admin 账号绑定到 admin 角色
    const adminRole = await Role.findOne({ where: { name: 'admin' } })
    const [link] = await UserRole.findOrCreate({
        where: { userId: admin.id, roleId: adminRole.id }
    })

    console.log(`绑定完成：${admin.username} → ${adminRole.name}`)
    console.log('现在重新登录一次，让新的 role 写进 token')
    process.exit(0)
}

run().catch(err => {
    console.error('初始化失败：', err.message)
    process.exit(1)
})
