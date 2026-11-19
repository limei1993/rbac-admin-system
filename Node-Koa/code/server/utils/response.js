/**
 * 统一响应格式
 *
 * 成功：{ code: 200, data: {...}, msg: 'success' }
 * 失败：{ code: 10001, msg: '错误描述' }
 *
 * 注意：前端的 axios 拦截器里写死了 SUCCESS_CODES = [200, 10000]
 *      成功码必须是 200 或 10000，否则前端会当成失败弹窗
 */

/**
 * 成功响应
 * @param {object} ctx  koa context
 * @param {any}    data 业务数据（对象/数组/字符串都行）
 * @param {string} msg  提示语
 */
const success = (ctx, data = null, msg = 'success') => {
    ctx.body = {
        code: 200,
        data,
        msg
    }
}

/**
 * 失败响应
 * @param {object} ctx  koa context
 * @param {string} msg  错误描述（前端会直接弹这个）
 * @param {number} code 业务错误码
 */
const fail = (ctx, msg = '操作失败', code = 500) => {
    ctx.body = {
        code,
        msg
    }
}

module.exports = {
    success,
    fail
}