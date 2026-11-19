// 图片资源映射（Vite 编译期静态分析，支持动态拼接文件名）
const modules = import.meta.glob('../assets/images/*', {
  eager: true,
  import: 'default'
})

/**
 * 根据文件名获取图片地址
 * @param {string} name 图片文件名（不含扩展名），如 'user'
 * @returns {string} 图片地址
 */
export const getImageUrl = (name) => {
  const key = `../assets/images/${name}.svg`
  return modules[key] || ''
}
