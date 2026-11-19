import { useUserStore } from '@/stores'

/**
 * v-perm 指令：按权限码控制元素显隐
 *
 * 用法：
 *   <el-button v-perm="'sys:user:create'">新增</el-button>
 *   <el-button v-perm="['sys:user:update', 'sys:user:edit']">编辑</el-button>
 *   <el-button v-perm="'sys:user:*'">用户相关操作</el-button>
 *
 * 说明：
 *  1. 数组形式是「命中任意一个就显示」（OR 关系）
 *  2. 支持通配符：'sys:user:*' 匹配 sys:user:create / sys:user:update 等
 *  3. 这里只做【展示层】优化，真正拦住请求的是后端 perm 中间件。
 *     就算有人绕过前端直接调接口，后端也会返回 403。
 *
 * 实现方式用 display:none 而不是移除元素：
 *   Vue 的 patch 阶段如果发现节点被指令删掉了，卸载时容易报错；
 *   隐藏元素既安全又保留了 DOM 结构。
 */
const perm = {
  mounted(el, binding) {
    applyPerm(el, binding.value)
  },
  updated(el, binding) {
    // 权限在运行时可能被改动（管理员改了授权，用户刷新后重新拉取），
    // 元素复用时这里要重新判断一次，否则显隐状态会停留在旧值
    applyPerm(el, binding.value)
  }
}

/**
 * 应用权限判断
 */
const applyPerm = (el, value) => {
  // 没写权限码 → 不做任何限制
  if (!value) {
    el.style.display = ''
    return
  }

  const userStore = useUserStore()
  const required = Array.isArray(value) ? value : [value]
  const granted = userStore.perms || []

  // 命中任意一个即显示
  const hit = required.some((code) => {
    if (granted.includes(code)) return true
    if (typeof code === 'string' && code.endsWith('*')) {
      const prefix = code.slice(0, -1)
      return granted.some((g) => g.startsWith(prefix))
    }
    return false
  })

  el.style.display = hit ? '' : 'none'
}

export default perm
