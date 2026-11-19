const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const Admin = require('../models/admin')
const Role = require('../models/role')
const UserRole = require('../models/userRole')
const { JWT_SECRET, JWT_EXPIRES } = require('../config/jwt')
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');

// 假的 bcrypt哈希：用户不存在时也走一次 compare，
// 让"账号不存在"和"密码错误"的响应耗时一致，避免被用来枚举账号
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10)

// POST /login  body: { username, password }
const login = async (ctx) => {
    const { username, password } = ctx.request.body || {}
    if (!username || !password) {
        throw new AppError('用户名或密码不能为空', 400, 10001);
    }

    const admin = await Admin.findOne({ where: { username } })

    // 即使用户不存在也要执行一次compare
    const matched = await bcrypt.compare(password, admin ? admin.password : DUMMY_HASH)
    if (!admin || !matched) {
        throw new AppError('用户名或密码错误', 401, 10002);
    }

    // 1. 查出这个用户绑定的角色（支持多角色，取并集）
    //    和菜单模块（controller/menu.js）保持同一套口径：角色实时查库
    const links = await UserRole.findAll({ where: { userId: admin.id } })
    const roleIds = links.map(l => l.roleId)
    let roles = []
    if (roleIds.length) {
        const rows = await Role.findAll({ where: { id: roleIds } })
        roles = rows.map(r => r.name)
    }
    // 兼容单角色场景：取第一个角色名，没绑角色时默认普通用户
    const roleName = roles[0] || 'user'

    // 签发 token: payload 里放用户身份，服务端不存session
    // 注意：payload 里的 role 只是登录那一刻的快照，
    //       真正的权限判定（rbac 中间件）一律实时查库，不信这个字段
    const token = jwt.sign(
        { id: admin.id, username: admin.username, role: roleName, roles },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
    )
   success(ctx, {
       token,
       username: admin.username,
       nickname: admin.nickname,
       role: roleName,
       roles
   }, '登录成功');
}

// POST /logout：JWT 是无状态的，服务端只做"前端清 token"，
// 真正的强制失效要靠黑名单（内存版/Redis 版），小项目先不做
const logout = async (ctx) => {
    success(ctx, null, '退出成功');
}

module.exports = {
    login,
    logout
};