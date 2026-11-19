const log4js = require('log4js')
const path = require('path')
const fs = require('fs')

/**
 * 日志级别映射
 * 与 log4js 内置级别一一对应，便于统一调用
 */
const levels = {
  trace: log4js.levels.TRACE,
  debug: log4js.levels.DEBUG,
  info: log4js.levels.INFO,
  warn: log4js.levels.WARN,
  error: log4js.levels.ERROR,
  fatal: log4js.levels.FATAL
}

// 日志目录（相对项目根，不受启动时 cwd 影响）
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../logs')
// 是否把日志写入文件，默认开启；设置 LOG_FILE=false 关闭
const LOG_FILE = process.env.LOG_FILE !== 'false'
// 控制台输出的最低级别
const LOG_LEVEL = process.env.LOG_LEVEL || 'debug'

if (LOG_FILE && !fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

/**
 * appenders：日志输出到哪里
 */
const appenders = {
  // 控制台
  console: { type: 'console' },
  // 全部日志，写入单个文件（超过 10MB 自动切割，保留 7 份）
  info: {
    type: 'file',
    filename: path.join(LOG_DIR, 'all-logs.log'),
    maxLogSize: 10 * 1024 * 1024,
    backups: 7,
    encoding: 'utf-8'
  },
  // 错误日志，按天切割成 log2026-11-16.log
  error: {
    type: 'dateFile',
    filename: path.join(LOG_DIR, 'log'),
    pattern: 'yyyy-MM-dd.log',
    alwaysIncludePattern: true,
    encoding: 'utf-8'
  }
}

/**
 * categories：日志分级路由
 * default  普通日志（debug 及以上）-> 控制台
 * info     业务日志            -> 控制台 + all-logs.log
 * error    异常日志            -> 控制台 + 按天切割的错误日志
 */
const categories = {
  default: {
    appenders: ['console'],
    level: LOG_LEVEL
  },
  info: {
    appenders: LOG_FILE ? ['info', 'console'] : ['console'],
    level: 'info'
  },
  error: {
    appenders: LOG_FILE ? ['console', 'error'] : ['console'],
    level: 'info'
  }
}

log4js.configure({ appenders, categories })

/**
 * 三个 category 对应的 logger 实例
 * 注意：category 必须在 configure 里先定义好，否则 getLogger 会报错
 */
const defaultLogger = log4js.getLogger()
const infoLogger = log4js.getLogger('info')
const errorLogger = log4js.getLogger('error')

/**
 * 级别 -> logger 的路由表
 */
const route = {
  trace: defaultLogger,
  debug: defaultLogger,
  info: infoLogger,
  warn: errorLogger,
  error: errorLogger,
  fatal: errorLogger
}

/**
 * 生成指定级别的日志方法
 * 注意：不要用 logger.level = xxx，该 setter 会改写整个 category 的级别，导致阈值失效
 * @param {string} level 日志级别，对应 levels 中的键
 * @returns {function} 接收日志内容的函数
 */
const write = (level) => (...args) => {
  route[level].log(level, ...args)
}

/**
 * 日志的输出的等级
 */
exports.trace = write('trace')
exports.debug = write('debug')
exports.info = write('info')
exports.warn = write('warn')
exports.error = write('error')
exports.fatal = write('fatal')

// 暴露原始 logger 与级别映射，便于自定义 category
exports.defaultLogger = defaultLogger
exports.infoLogger = infoLogger
exports.errorLogger = errorLogger
exports.levels = levels
