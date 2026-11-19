<template>
  <div class="login-page">
    <!-- 背景场景：与登录页保持一致（纯 CSS 绘制，无需外部图片） -->
    <div class="bg-scene" aria-hidden="true">
      <span class="wire wire-1"></span>
      <span class="wire wire-2"></span>
      <span class="pole pole-1"></span>
      <span class="pole pole-2"></span>
      <span class="horizon"></span>
    </div>

    <!-- 注册卡片 -->
    <div class="login-card">
      <h3 class="login-title">注册账号</h3>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="0"
        size="small"
        @submit.prevent="handleRegister"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名（3-20 位）"
            clearable
            @keyup.enter="handleRegister"
          />
        </el-form-item>

        <el-form-item prop="nickname">
          <el-input
            v-model="form.nickname"
            placeholder="昵称（选填，默认与用户名相同）"
            clearable
            @keyup.enter="handleRegister"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码（至少 6 位）"
            show-password
            @keyup.enter="handleRegister"
          />
        </el-form-item>

        <el-form-item prop="confirm">
          <el-input
            v-model="form.confirm"
            type="password"
            placeholder="请再次输入密码"
            show-password
            @keyup.enter="handleRegister"
          />
        </el-form-item>

        <div class="login-actions">
          <el-button type="primary" :loading="loading" @click="handleRegister">注册</el-button>
        </div>
      </el-form>

      <div class="login-links">
        <span class="tip">已有账号？</span>
        <el-button link type="primary" @click="router.push('/login')">去登录</el-button>
      </div>

      <p class="mock-tip">注册成功即自动登录，默认为「普通用户」角色</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { register } from '@/api/register'
import { useMenuStore, useUserStore } from '@/stores'

const router = useRouter()
const userStore = useUserStore()
const menuStore = useMenuStore()

const formRef = ref()
const loading = ref(false)

const form = reactive({
  username: '',
  nickname: '',
  password: '',
  confirm: ''
})

// 表单校验规则：与后端 register 接口的校验保持一致
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度需在 3-20 位之间', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' }
  ],
  confirm: [{ required: true, message: '请再次输入密码', trigger: 'blur' }]
}

const handleRegister = async () => {
  // 1. 表单基础校验
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  // 2. 两次密码一致性校验
  //    放在提交时做，避免受 Element Plus 版本差异影响
  if (form.password !== form.confirm) {
    ElMessage.error('两次输入的密码不一致')
    return
  }

  loading.value = true
  try {
    // 3. 调用注册接口
    const res = await register({
      username: form.username.trim(),
      nickname: form.nickname.trim(),
      password: form.password
    })

    // 4. 注册即登录：后端已直接返回 token，直接写入登录态
    userStore.setLogin(res.data?.token, res.data?.username, res.data?.role)

    // 清掉菜单缓存：新账号是「普通用户」角色，菜单要重新拉
    menuStore.resetMenus()

    ElMessage.success('注册成功')

    // 5. 跳首页
    router.replace('/')
  } catch (e) {
    // handled 标记表示错误已由 request 拦截器提示过，避免重复弹窗
    if (!e.handled) {
      ElMessage.error(e.message || '注册失败')
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

/* ============ 注册卡片 ============ */
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

.login-links {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 14px;
  font-size: 12px;
  color: #909399;
}

.mock-tip {
  margin: 10px 0 0;
  font-size: 12px;
  color: #b0b3b8;
  text-align: center;
}
</style>
