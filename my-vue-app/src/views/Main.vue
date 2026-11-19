<script setup>
import CommonAside from '@/components/CommonAside.vue'
import CommonHeader from '@/components/CommonHeader.vue'

// 标签页
const activeTab = ref('first')
</script>

<template>
  <div class="common-layout">
    <el-container class="lay-container">
      <!-- 自定义左侧的组件 -->
      <common-aside />
      <el-container>
        <el-header class="app-header">
          <common-header />
        </el-header>
        <el-main class="right-main">
          <!-- 标签页 -->
          <el-tabs v-model="activeTab" class="layout-tabs">
            <el-tab-pane label="标签页操作" name="first" />
            <el-tab-pane label="用户管理" name="second" />
          </el-tabs>

          <!-- 页面内容 -->
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<style lang="less" scoped>
.common-layout {
  width: 100%;
  height: 100%;
}

.lay-container {
  width: 100%;
  height: 100%;
}

.app-header {
  height: 50px;
  padding: 0 16px;
  background-color: #17212e;
  border-bottom: none;
}

.right-main {
  padding: 0;
  overflow: auto;
  background-color: #f0f2f5;
}

.layout-tabs {
  padding: 0 16px;
  background-color: #fff;

  :deep(.el-tabs__header) {
    margin-bottom: 0;
  }
}
</style>
