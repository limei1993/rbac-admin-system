<template>
  <div class="page-card">
    <el-card shadow="never">
      <template #header>商品管理</template>
      <el-table :data="tableData" border style="width: 100%">
        <el-table-column prop="name" label="商品名称" />
        <el-table-column prop="price" label="价格" />
        <el-table-column prop="stock" label="库存" />
        <el-table-column prop="status" label="状态" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
const tableData = [
  { name: '蓝牙耳机', price: '￥299', stock: 120, status: '在售' },
  { name: '机械键盘', price: '￥599', stock: 80, status: '在售' },
  { name: '人体工学椅', price: '￥1299', stock: 30, status: '缺货' },
  { name: '4K 显示器', price: '￥2199', stock: 45, status: '在售' }
]
</script>

<style lang="less" scoped>
.page-card {
  padding: 10px;
}
</style>
