<template>
  <el-aside class="common-aside" :width="width">
    <el-menu
      :default-active="activeMenu"
      class="el-menu-vertical-demo"
      :collapse="collapse"
      :collapse-transition="false"
      background-color="transparent"
      text-color="#a3b1c6"
      active-text-color="#ffffff"
      router
      @open="handleOpen"
      @close="handleClose"
    >
      <h3 v-show="!collapse" class="menu-title">通用后台管理系统</h3>
      <h3 v-show="collapse" class="menu-title">后台</h3>

      <!-- 菜单加载中 -->
      <div v-if="menuStore.loading" class="menu-tip">菜单加载中…</div>

      <!-- 菜单加载失败 -->
      <div v-else-if="menuStore.error" class="menu-tip menu-tip--error">
        菜单加载失败
        <el-button link type="primary" size="small" @click="handleRefresh">重试</el-button>
      </div>

      <!-- 该角色没有配置任何菜单 -->
      <div v-else-if="!menuStore.menus.length" class="menu-tip">暂无可访问的菜单</div>

      <!--
        菜单树由后端 /menus 接口按当前用户的角色下发，
        这里用递归组件渲染，层级多少都能显示
      -->
      <MenuItem v-for="item in pageMenus" :key="item.id" :item="item" />
    </el-menu>
  </el-aside>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAllDataStore, useMenuStore } from '@/stores'
import MenuItem from '@/components/MenuItem.vue'

const route = useRoute()

// 当前选中的菜单（跟着路由走）
const activeMenu = computed(() => route.path)

const store = useAllDataStore()
const menuStore = useMenuStore()

const collapse = computed(() => store.state.isCollapse)
const width = computed(() => (collapse.value ? '64px' : '180px'))

// 侧边栏只渲染「页面级」菜单。
// 按钮（type = 'button'）只是权限载体，不对应任何路由，不能出现在导航里 ——
// 后端 GET /menus 已经过滤过一次，这里是前端兜底。
const pageMenus = computed(() =>
  (menuStore.menus || []).filter((item) => item.type !== 'button')
)

// 首次进入后台时拉一次菜单（路由守卫里也会拉，这里兜底，保证侧边栏一定有数据）
onMounted(() => {
  if (!menuStore.loaded) {
    loadMenus()
  }
})

const loadMenus = async () => {
  try {
    await menuStore.loadMenus()
  } catch (e) {
    // 错误已经被 axios 拦截器提示过，这里只做状态标记
    console.warn('菜单加载失败：', e.message)
  }
}

// 手动刷新菜单（比如管理员在另一个页面改了权限）
const handleRefresh = async () => {
  try {
    await menuStore.loadMenus(true)
    ElMessage.success('菜单已刷新')
  } catch (e) {
    console.warn('菜单刷新失败：', e.message)
  }
}

const handleOpen = (index) => {
  console.log('打开菜单：', index)
}

const handleClose = (index) => {
  console.log('关闭菜单：', index)
}
</script>

<style lang="less" scoped>
.common-aside {
  height: 100%;
  background-color: #1f2d3d;
  overflow-x: hidden;
  overflow-y: auto;
  transition: width 0.28s;
}

.menu-title {
  margin: 0;
  padding: 16px 0;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 1px;
  text-align: center;
  white-space: nowrap;
  background-color: #17212e;
}

.el-menu-vertical-demo {
  height: 100%;
  border-right: none;

  :deep(.el-menu-item) {
    height: 44px;
    line-height: 44px;
  }

  :deep(.el-menu-item.is-active) {
    background-color: #409eff;
  }

  :deep(.el-menu-item:hover) {
    background-color: #263445;
  }

  /* 收起状态下图标居中 */
  &.el-menu--collapse :deep(.el-menu-item),
  &.el-menu--collapse :deep(.el-sub-menu__title) {
    justify-content: center;
  }
}

.icons {
  margin-right: 6px;
  font-size: 16px;
}

/* 菜单为空 / 加载中 / 加载失败的提示 */
.menu-tip {
  padding: 16px 10px;
  color: #7f8ea3;
  font-size: 12px;
  text-align: center;
  line-height: 1.6;

  &--error {
    color: #f56c6c;
  }
}
</style>
