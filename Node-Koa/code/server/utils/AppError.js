/**
 * 业务错误：由后端主动抛出的「预期内」的异常
 * expose = true 表示这个信息可以安全地返回给前端
 */
class AppError extends Error {
  constructor(message, status = 400, code = 10001) {
    super(message)
    this.name = 'AppError';
    this.status = status;     // HTTP 状态码
    this.code = code;         // 业务错误码
    this.expose = true;       // 允许把 message 透传给前端
  }
}

module.exports = AppError;