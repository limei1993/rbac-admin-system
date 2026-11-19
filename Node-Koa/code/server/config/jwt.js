/**
 * JWT 配置
 *
 * 密钥必须通过环境变量注入：
 *   JWT_SECRET=xxx npm run dev
 *   NODE_ENV=production JWT_SECRET=xxx node bin/www
 *
 * 安全策略：
 *   - 生产环境（NODE_ENV=production）：没配 JWT_SECRET 直接终止启动，
 *     避免"忘了配置"导致所有人都能用默认密钥伪造 admin 的 token
 *   - 开发环境：允许用默认值兜底，但会打醒目警告，提示不能上生产
 */
const IS_PROD = process.env.NODE_ENV === 'production'
const SECRET = process.env.JWT_SECRET

if (!SECRET) {
    if (IS_PROD) {
        console.error(
            '[FATAL] 生产环境必须配置 JWT_SECRET 环境变量，服务已终止启动。\n' +
            '        例：JWT_SECRET=<你的密钥> NODE_ENV=production node bin/www'
        )
        process.exit(1)
    }
    console.warn(
        '[WARN] 未配置 JWT_SECRET，正在使用开发环境默认密钥，仅限本地调试，禁止用于生产！'
    )
}

module.exports = {
    // 生产环境走环境变量；开发环境兜底默认值
    JWT_SECRET: SECRET || 'my-vue-app-dev-secret-please-change',
    // token 有效期
    JWT_EXPIRES: process.env.JWT_EXPIRES || '2h',
    // 签发者标识（iss）：verify 时强制校验，
    // 防止「别的系统用同一密钥签出来的 token」串到这个系统来用
    JWT_ISSUER: process.env.JWT_ISSUER || 'rbac-admin-system'
}
