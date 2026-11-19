const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const Admin = require('../models/admin')
const Role = require('../models/role')
const UserRole = require('../models/userRole')
const { JWT_SECRET, JWT_EXPIRES, JWT_ISSUER } = require('../config/jwt')
const { success } = require('../utils/response')
const AppError = require('../utils/AppError')

/**
 * 注册（自助注册 → 只会是普通用户）
 * POST /register
 * body: { username, password, nickname? }
 *
 * 三条安全约定：
 *  1. 角色由服务端写死为 'user'，永远不读 body.role
 *  2. 密码只存 bcrypt 哈希，不存明文
 *  3. username 唯一，重复返回友好提示而不是 500
 */
const register = async (ctx) => {
    const { username, password, nickname } = ctx.request.body || {}
    // 1.参数校验
    if (!username || !password) {
        throw new AppError('用户名或密码不能为空', 400, 10001);
    }

    const name = String(username).trim()
    if (name.length < 3 || name.length > 20) {
        throw new AppError('用户名长度需在 3-20 位之间', 400, 10003)
    }

    if (String(password).length < 6) {
        throw new AppError('密码长度需在 6 位以上', 400, 10004)
    }

    // 2. 唯一性校验
    // 先查一次，是为了给【该用户名已被注册】这种友好提示
    // 数据库的 unique 约束是最终兜底（下面catch里处理并发情况）
    const exist = await Admin.findOne({ where: { username: name } })
    if (exist) {
        throw new AppError('用户名已被注册', 400, 10005)
    }

    // 3. 创建账号（密码哈希）
    const hash = await bcrypt.hash(password, 10)
    let account
    try {
        account = await Admin.create({
            username: name,
            password: hash,
            nickname: nickname ? String(nickname).trim() : name
        })
    } catch (err) {
        // 兜底：两个请求并发注册一个用户名
        // 两个都通过上面的findOne，靠数据库唯一索引拦住
        if (err.name === 'SequelizeUniqueConstraintError') {
            throw new AppError('用户名已被注册', 400, 10005)
        }
        throw err
    }

    // 4.绑定【普通用户角色】
    const [userRole] = await Role.findOrCreate({
        where: { name: 'user' },
        defaults: { name: 'user', description: '普通用户' }
    })
    await UserRole.findOrCreate({ 
        where: { userId: account.id, roleId: userRole.id } 
    })

    // 5.签发token（注册即登录，省的用户再回登录页输一遍）
    // payload 只放身份，角色不入 token（和 login.js 保持同一口径，理由见那里）
    const token = jwt.sign(
        { id: account.id, username: account.username },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES, issuer: JWT_ISSUER }
    )

    success(ctx, {
        token,
        username: account.username,
        nickname: account.nickname,
        role: userRole.name,
        roles: [userRole.name]
    }, '注册成功')
}

module.exports = {
    register
}