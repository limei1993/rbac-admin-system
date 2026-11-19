const { fail } = require('../utils/response')
/**
 * 全局错误处理中间件
 * 
 * 用法（app.js里）
 *  app.use(require('./middleware/error')());
 * 
 *  原理：Koa 的洋葱模型，错误会从内层往外冒泡
 *       这个中间件在最外层 try/catch 就能兜住所有controller 抛出的异常
 * **/
module.exports = () => async (ctx, next) => {
  try {
    await next() // 交给后面的中间件和路由
  } catch (err) {
    // 1. HTTP 状态码： 自定义错误带status就用它， 否则500
    const status = err.status || 500

    // 2. 业务错误码： 自定义错误带code就用它， 否则500
    const code = err.code || status;

    // 3. 错误信息
    // expose 为true 的是【预期内的错误】，可以原样告诉前端
    // 其他（数据库崩了，代码bug）统一给一句模糊提示，不暴漏内部细节
    const msg = err.expose ? err.message : '服务器内部错误'

    // 4. 返回统一格式
    ctx.status = status;
    fail(ctx, msg, code);

    // 5. 交给app.on('error') 统一记日志
    // app.js 里已经注册了 log.error('server error', err, ctx)
    ctx.app.emit('error', err, ctx)
  }
}