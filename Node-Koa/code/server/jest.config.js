module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'], // 规定测试文件放在 tests 目录下
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'], // 新增
};