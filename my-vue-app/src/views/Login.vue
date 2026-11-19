<template>
  <div class="login-page">
    <!-- 背景场景：黄昏天空 + 烟花 + 电线杆（纯 CSS 绘制，无需外部图片） -->
    <div class="bg-scene" aria-hidden="true">
      <span class="wire wire-1"></span>
      <span class="wire wire-2"></span>
      <span class="pole pole-1"></span>
      <span class="pole pole-2"></span>
      <span class="horizon"></span>
    </div>

    <!-- 登录卡片 -->
    <div class="login-card">
      <h3 class="login-title">欢迎登录</h3>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="0"
        size="small"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入账号"
            clearable
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <div class="login-actions">
          <el-button type="primary" :loading="loading" @click="handleLogin">登录</el-button>
        </div>
      </el-form>

      <div class="login-links">
        <span class="tip">还没有账号？</span>
        <el-button link type="primary" @click="router.push('/register')">立即注册</el-button>
      </div>

      <p v-if="mockTip" class="mock-tip">当前为前端模拟登录，测试账号 admin / 123456</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login, isMockMode } from '@/api/login'
import { useMenuStore, useUserStore } from '@/stores'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const menuStore = useMenuStore()

const formRef = ref()
const loading = ref(false)
const mockTip = isMockMode()

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  // 表单校验
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    // 调用登录接口（后端未就绪时走 mock，后端就绪后自动切换）
    const res = await login({ username: form.username, password: form.password })

    // 保存登录态（token / 用户名 / 角色）
    // 后端返回的 roles 是实时查库后的角色数组，按钮权限以它为准
    userStore.setLogin(
      res.data?.token,
      res.data?.username || form.username,
      res.data?.role,
      res.data?.roles
    )

    // 清掉上一个账号残留的菜单缓存（换了账号，能看到的菜单可能不一样）
    menuStore.resetMenus()

    ElMessage.success('登录成功')

    // 跳回登录前想访问的页面，没有则回首页
    router.replace(route.query.redirect || '/')
  } catch (e) {
    // handled 标记表示错误已由 request 拦截器提示过，避免重复弹窗
    if (!e.handled) {
      ElMessage.error(e.message || '登录失败')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style lang="less" scoped>
.login-page {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ============ 背景场景 ============ */
.bg-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;

  // 黄昏天空：深紫 → 玫红 → 橙金 → 地面
  background-image:
    // 地平线暖光
    radial-gradient(ellipse 70% 26% at 52% 82%, rgba(255, 186, 110, 0.45), transparent 70%),
    // 高空烟花光点
    radial-gradient(circle at 73% 25%, rgba(255, 233, 176, 0.95) 0 1.6px, transparent 2.6px),
    radial-gradient(circle at 76.5% 21.5%, rgba(255, 214, 140, 0.8) 0 1.2px, transparent 2.2px),
    radial-gradient(circle at 70% 29%, rgba(255, 201, 128, 0.7) 0 1.1px, transparent 2.1px),
    radial-gradient(circle at 79% 27.5%, rgba(255, 226, 160, 0.6) 0 1px, transparent 2px),
    // 云层
    radial-gradient(ellipse 62% 28% at 20% 33%, rgba(255, 173, 130, 0.30), transparent 72%),
    radial-gradient(ellipse 74% 24% at 70% 44%, rgba(224, 124, 114, 0.26), transparent 72%),
    radial-gradient(ellipse 48% 18% at 42% 58%, rgba(255, 160, 116, 0.22), transparent 74%),
    // 天空主渐变
    linear-gradient(
      180deg,
      #241a45 0%,
      #452a5c 24%,
      #8a3f5e 46%,
      #c95d4a 64%,
      #ef9559 76%,
      #f8c978 83%,
      #3b2b3c 83.6%,
      #1b1424 100%
    );
}

// 地平线
.horizon {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 17%;
  background: linear-gradient(180deg, rgba(20, 14, 26, 0.2), rgba(14, 10, 18, 0.92) 62%);
}

// 电线杆（近处）
.pole {
  position: absolute;
  bottom: 0;
  width: 7px;
  background: linear-gradient(180deg, rgba(24, 17, 30, 0.96), rgba(10, 7, 14, 0.99));

  // 横臂
  &::before {
    content: '';
    position: absolute;
    top: 8px;
    left: -28px;
    width: 62px;
    height: 4px;
    background: rgba(18, 12, 22, 0.96);
  }

  // 路灯
  &::after {
    content: '';
    position: absolute;
    top: 5px;
    left: -31px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #ffdca6;
    box-shadow:
      0 0 12px 5px rgba(255, 202, 132, 0.8),
      0 0 38px 16px rgba(255, 178, 108, 0.3);
  }
}

.pole-1 {
  left: 38%;
  height: 54%;
}

.pole-2 {
  left: 71%;
  height: 38%;
  opacity: 0.75;
  transform: scale(0.7);
  transform-origin: bottom center;

  &::after {
    box-shadow:
      0 0 10px 4px rgba(255, 202, 132, 0.7),
      0 0 30px 12px rgba(255, 178, 108, 0.22);
  }
}

// 电线
.wire {
  position: absolute;
  left: -10%;
  width: 120%;
  height: 2px;
  background: rgba(12, 8, 16, 0.72);
}

.wire-1 {
  top: 19%;
  transform: rotate(-3.4deg);
}

.wire-2 {
  top: 27%;
  transform: rotate(1.6deg);
  opacity: 0.6;
}

/* ============ 登录卡片 ============ */
.login-card {
  position: relative;
  z-index: 2;
  width: 380px;
  padding: 36px 42px 30px;
  background-color: rgba(255, 255, 255, 0.97);
  border-radius: 6px;
  box-shadow: 0 14px 44px rgba(0, 0, 0, 0.32);
}

.login-title {
  margin: 0 0 24px;
  font-size: 15px;
  font-weight: 400;
  color: #606266;
  text-align: center;
}

.login-actions {
  display: flex;
  justify-content: center;
  margin-top: 2px;

  :deep(.el-button) {
    width: 76px;
  }
}

.mock-tip {
  margin: 16px 0 0;
  font-size: 12px;
  color: #b0b3b8;
  text-align: center;
}

.login-links {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 14px;
  font-size: 12px;
  color: #909399;
}
</style>
