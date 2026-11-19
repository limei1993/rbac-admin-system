const bcrypt = require('bcryptjs')
const Admin = require('../models/admin')

const run = async () => {
  const username = 'admin'
  const password = '123456'

  // 密码必须哈希后存库，bcrypt 每次生成的哈希都不同，靠 compare 验证
  const hash = await bcrypt.hash(password, 10)

  const exist = await Admin.findOne({ where: { username } })
  if (exist) {
    await Admin.update({ password: hash }, { where: { username } })
    console.log(`管理员已重置密码：${username} / ${password}`)
  } else {
    await Admin.create({ username, password: hash, nickname: '超级管理员' })
    console.log(`管理员创建成功：${username} / ${password}`)
  }
  process.exit(0)
}

run().catch(err => {
  console.error('初始化失败：', err.message)
  process.exit(1)
})
