<template>
  <!-- 有子菜单 → 渲染成可展开的子菜单 -->
  <el-sub-menu v-if="hasChildren" :index="subIndex">
    <template #title>
      <el-icon class="icons"><component :is="item.icon" /></el-icon>
      <span>{{ item.name }}</span>
    </template>

    <!--
      递归渲染下一层。
      Vue 3 的 SFC 里，组件可以直接用【自己的文件名】引用自己，
      所以这里不需要 import 自己，也不会有循环依赖。
    -->
    <MenuItem v-for="child in item.children" :key="child.id" :item="child" />
  </el-sub-menu>

  <!-- 没有子菜单 → 渲染成可点击的菜单项 -->
  <el-menu-item v-else :index="item.path">
    <el-icon class="icons"><component :is="item.icon" /></el-icon>
    <template #title>{{ item.name }}</template>
  </el-menu-item>
</template>

<script setup>
import { computed } from 'vue'

// 显式声明组件名，配合文件名做自引用（递归组件必须有 name）
defineOptions({ name: 'MenuItem' })

const props = defineProps({
  // 一条菜单数据，结构由后端 /menus 接口下发
  item: { type: Object, required: true }
})

// 有没有子菜单
const hasChildren = computed(
  () => Array.isArray(props.item.children) && props.item.children.length > 0
)

// 子菜单的 index 只作为 el-menu 内部的唯一标识，不参与路由跳转
// （el-menu 的 router 模式只会拿 el-menu-item 的 index 去 push）
const subIndex = computed(() => `sub-${props.item.id}`)
</script>
