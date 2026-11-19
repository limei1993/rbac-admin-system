<template>
  <div class="header">
    <div class="l-content">
      <!-- 折叠/展开菜单按钮 -->
      <el-button size="small" class="menu-btn" @click="handleCollapse">
        <el-icon class="icons">
          <component :is="collapse ? 'Expand' : 'Fold'" />
        </el-icon>
      </el-button>

      <!-- 面包屑 -->
      <el-breadcrumb separator="/" class="bread">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item v-if="route.path !== '/'">
          {{ currentTitle }}
        </el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="r-content">
      <el-dropdown @command="handleCommand">
        <span class="el-dropdown-link">
          <img :src="getImageUrl('user')" class="user" />
          <span v-if="userStore.username" class="username">{{ userStore.username }}</span>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">个人中心</el-dropdown-item>
            <el-dropdown-item command="logout">退出</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getImageUrl } from '@/utils'
import { useAllDataStore, useMenuStore, useUserStore } from '@/stores'
const store = useAllDataStore()
const userStore = useUserStore()
const menuStore = useMenuStore()
// 侧边栏是否折叠（和 CommonAside.vue 用的是同一个状态）
const collapse = computed(() => store.state.isCollapse)
const handleCollapse = () => {
  store.state.isCollapse = !store.state.isCollapse
}

const route = useRoute()
const router = useRouter()

// 当前页面标题（取自路由 meta）
const currentTitle = computed(() => route.meta.title || '首页')

// 下拉菜单命令：个人中心 / 退出登录
const handleCommand = (command) => {
  if (command === 'logout') {
    userStore.logout()
    // 清空菜单缓存，否则下一个登录的用户会短暂看到上一个人的菜单
    menuStore.resetMenus()
    ElMessage.success('已退出登录')
    router.replace('/login')
  }
}
</script>

<style lang="less" scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

.l-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.menu-btn {
  padding: 6px 8px;
  background-color: transparent;
  border-color: #3a4757;

  :deep(.el-icon) {
    color: #cfd6e0;
  }

  &:hover {
    background-color: #263445;
    border-color: #409eff;

    :deep(.el-icon) {
      color: #ffffff;
    }
  }
}

.bread {
  font-size: 13px;
  line-height: 1;

  :deep(.el-breadcrumb__inner) {
    color: #d3d9e0;
    font-weight: 400;
  }

  :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
    color: #ffffff;
  }
}

.r-content {
  display: flex;
  align-items: center;
}

.user {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  vertical-align: middle;
  cursor: pointer;
}

.username {
  margin-left: 8px;
  font-size: 13px;
  color: #d3d9e0;
}
</style>
