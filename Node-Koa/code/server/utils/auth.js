const jwt = require('jsonwebtoken')
const { JWT_SECRET } = require('../config/jwt')
const log = require('./log4js')

/**
 * 鉴权中间件：校验 Authorization: Bearer <token>
 *校验通过后把用户信息挂到 ctx.state.user
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
        decoded = ctx.state.user = jwt.verify(token, JWT_SECRET)
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
    // 2. 解析成功，把用户信息挂在 ctx 上，放行！
    ctx.state.user = decoded;
    // 注意：这里不要用 try/catch 包 next()，让后续业务报错直接冒泡给全局中间件！
    await next()
}
module.exports = auth