const Joi = require('joi');
const AppError = require('../utils/AppError'); // 自定义错误类

/**
 * 生成一个校验中间件
 * @param {Object} schema - Joi 的校验规则对象
 * @param {String} property - 要校验的数据在哪里（默认 'body'，也可以是 'query' 或 'params'）
 */
const validate = (schema, property = 'body') => {
    return async (ctx, next) => {
       // 1. 获取前端来的数据
       const data = ctx.request[property];

        // 2. 用Joi进行校验
        // abortEarly: false, 表示如果有多个报错，就一次性全部收集起来返回
        const {  error, value } = schema.validate(data, { abortEarly: false });

        // 3. 如果有错误，抛出异常（会被咱们刚才写的全局错误中间件接住）
        if (error) {
            // 把报错信息拼接成一句通俗的话，比如："name 不能为空; age 必须是数字"
            const msg = error.details.map((item) => item.message).join('; ');
            throw new AppError(msg, 400, 10001); // 400 是请求参数错误
        }

        // 4. 校验通过，把过滤后的干净数据重新塞给 ctx（防止前端多传了恶意字段）
        ctx.request[property] = value;

        // 5. 放行，去执行后面的 Controller
        await next();
    }
}

module.exports = validate;
