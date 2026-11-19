const jwt = require('jsonwebtoken')
const { JWT_SECRET, JWT_ISSUER } = require('../config/jwt')
const Admin = require('../models/admin')
const log = require('./log4js')

/**
 * 鉴权中间件：校验 Authorization: Bearer <token>
 * 校验通过后把用户信息挂到 ctx.state.user
 *
 * 本中间件只回答一个问题：你是谁（身份）
 * 你能做什么（权限）由 rbac 中间件实时查库判断，见 middleware/rbac.js
 *
 * 两道校验，缺一不可：
 *   1. JWT 签名有效 + 未过期 + issuer 匹配 → 证明「你确实登录过」
 *   2. 账号在数据库里仍然存在              → 保证「你现在还是有效用户」
 *
 * 第 2 条不能省：JWT 是自包含的，签名有效只代表「签发那一刻这个账号存在」。
 * 员工离职后管理员删了账号，他手里的 token 在过期前照样能调接口。
 * 补一次存在性校验后，「账号被删」和「token 过期」一样立即失效。
 */
const auth = async (ctx, next) => {
    const header = ctx.headers.authorization || '';

    // Authorization 头里带着 Bearer token，不要整体打日志，否则凭证会泄露到日志文件

    // 取出 token（兼容没带 Bearer 前缀的情况）
    const token = header.replace(/^Bearer\s+/i, '');

    if (!token) {
        ctx.status = 401;
        ctx.body = { code: 40100, msg: '未登录，请先登录' };
        return;
    }
    let decoded;

    try {
        // issuer 校验：防止别的系统用同一密钥签出来的 token 串到这里用
        decoded = jwt.verify(token, JWT_SECRET, { issuer: JWT_ISSUER })
    } catch (error) {
        // 校验失败原因记到日志里（不打印 token 本身，避免凭证泄露）
        log.debug('JWT 校验失败：', error.message);
        ctx.status = 401;
        ctx.body = {
            code: 40100,
            msg: error.name === 'TokenExpiredError' ? '登录已过期，请重新登录' : '登录凭证无效'
        };
        return;
    }

    // 2. 签名有效，再确认这个账号【现在还存在】
    //    只取需要的字段，不把 password 哈希带进 ctx
    let account
    try {
        account = await Admin.findOne({
            where: { id: decoded.id },
            attributes: ['id', 'username', 'nickname']
        })
    } catch (err) {
        // 查库失败必须「拒绝」而不是「放行」（fail closed）：
        // 身份校验属于安全边界，宁可报错也不能降级放行
        ctx.status = 500
        ctx.body = { code: 50000, msg: '身份校验失败，请稍后重试' }
        return
    }

    if (!account) {
        // 账号已被删除 → 凭证直接作废，要求重新登录
        ctx.status = 401
        ctx.body = { code: 40100, msg: '账号不存在或已被禁用，请重新登录' }
        return
    }

    // 3. 以数据库里的当前记录为准挂到 ctx 上，放行！
    //    注意：这里【不用】token 里的快照做权限判断，
    //    token 里现在只有 id / username，角色一律实时查库（见 rbac.js）
    ctx.state.user = {
        id: account.id,
        username: account.username,
        nickname: account.nickname
    };
    // 注意：这里不要用 try/catch 包 next()，让后续业务报错直接冒泡给全局中间件！
    await next()
}
module.exports = auth