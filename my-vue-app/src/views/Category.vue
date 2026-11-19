<template>
  <div class="page-card">
    <el-card shadow="never">
      <template #header>分类展示</template>
      <el-table :data="tableData" border style="width: 100%">
        <el-table-column prop="name" label="分类名称" />
        <el-table-column prop="code" label="分类编码" />
        <el-table-column prop="count" label="商品数量" />
        <el-table-column prop="status" label="状态" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
const tableData = [
  { name: '手机数码', code: 'C001', count: 128, status: '显示' },
  { name: '电脑办公', code: 'C002', count: 86, status: '显示' },
  { name: '家用电器', code: 'C003', count: 54, status: '显示' },
  { name: '服饰鞋包', code: 'C004', count: 210, status: '隐藏' }
]
</script>

<style lang="less" scoped>
.page-card {
  padding: 10px;
}
</style>
