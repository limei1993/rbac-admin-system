<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// 按需注册 echarts 模块，减小打包体积
echarts.use([
  LineChart,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer
])

/* ---------------- 数据 ---------------- */

// 顶部统计卡片
const statCards = [
  { icon: 'Clock', bg: '#40c9c6', value: '1234', label: '今日成交订单' },
  { icon: 'Star', bg: '#f0a020', value: '210', label: '今日销售订单' },
  { icon: 'ShoppingBag', bg: '#409eff', value: '1234', label: '今日成交金额' },
  { icon: 'Timer', bg: '#36a3f7', value: '1234', label: '今日访问次数' },
  { icon: 'Star', bg: '#f0a020', value: '210', label: '今日销售订单' },
  { icon: 'ShoppingBag', bg: '#409eff', value: '1234', label: '今日成交金额' }
]

// 品牌销量表格
const tableData = [
  { brand: 'oppo', today: 500, month: 3500, total: 22300 },
  { brand: 'vivo', today: 300, month: 2200, total: 24000 },
  { brand: '苹果', today: 800, month: 4500, total: 63000 },
  { brand: '小米', today: 1200, month: 6500, total: 45000 },
  { brand: '三星', today: 300, month: 2000, total: 34000 },
  { brand: '魅族', today: 350, month: 3000, total: 22000 }
]

/* ---------------- 图表 ---------------- */

const lineRef = ref(null)
const barRef = ref(null)
const pieRef = ref(null)
const charts = []

const initCharts = () => {
  // 折线图
  const lineChart = echarts.init(lineRef.value)
  lineChart.setOption({
    color: ['#409eff', '#f0a020', '#36a3f7', '#f56c6c', '#36c98c'],
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['苹果', 'vivo', 'oppo', '三星', '小米'],
      top: 0,
      itemWidth: 12,
      itemHeight: 8,
      textStyle: { fontSize: 11 }
    },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: ['苹果', 'vivo', 'oppo', '三星', '小米'],
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      axisLabel: { fontSize: 10, color: '#909399' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 10, color: '#909399' },
      splitLine: { lineStyle: { color: '#ebeef5' } }
    },
    series: [
      { name: '苹果', type: 'line', data: [4200, 3000, 5100, 2400, 5100], smooth: true },
      { name: 'vivo', type: 'line', data: [3800, 2000, 4600, 1500, 4200], smooth: true },
      { name: 'oppo', type: 'line', data: [3500, 3400, 4500, 1300, 3900], smooth: true },
      { name: '三星', type: 'line', data: [2400, 1200, 2600, 800, 2600], smooth: true },
      { name: '小米', type: 'line', data: [2100, 2500, 3300, 1100, 3400], smooth: true }
    ]
  })

  // 柱状图
  const barChart = echarts.init(barRef.value)
  barChart.setOption({
    color: ['#409eff', '#a0cfff'],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['新增用户', '活跃用户'], top: 0, itemWidth: 12, itemHeight: 8 },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      axisLabel: { fontSize: 10, color: '#909399' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 10, color: '#909399' },
      splitLine: { lineStyle: { color: '#ebeef5' } }
    },
    series: [
      { name: '新增用户', type: 'bar', data: [320, 402, 501, 634, 590, 630, 720] },
      { name: '活跃用户', type: 'bar', data: [120, 202, 301, 434, 390, 430, 520] }
    ]
  })

  // 饼图
  const pieChart = echarts.init(pieRef.value)
  pieChart.setOption({
    color: ['#409eff', '#36a3f7', '#f0a020', '#36c98c', '#f56c6c', '#9254de'],
    tooltip: { trigger: 'item' },
    legend: {
      bottom: 0,
      itemWidth: 10,
      itemHeight: 8,
      textStyle: { fontSize: 10, color: '#909399' }
    },
    series: [
      {
        name: '销量占比',
        type: 'pie',
        radius: ['38%', '62%'],
        center: ['50%', '45%'],
        label: { fontSize: 10, color: '#909399' },
        data: [
          { value: 1024, name: '苹果' },
          { value: 800, name: 'vivo' },
          { value: 1200, name: 'oppo' },
          { value: 600, name: '小米' },
          { value: 900, name: '三星' },
          { value: 400, name: '魅族' }
        ]
      }
    ]
  })

  charts.push(lineChart, barChart, pieChart)
}

const resizeCharts = () => {
  charts.forEach((chart) => chart.resize())
}

onMounted(() => {
  initCharts()
  window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  charts.forEach((chart) => chart.dispose())
})
</script>

<template>
  <div class="home-page">
    <!-- 左侧栏 -->
    <div class="home-left">
      <!-- 用户信息 -->
      <div class="card user-card">
        <el-avatar :size="60" src="" class="user-avatar">A</el-avatar>
        <div class="user-text">
          <div class="user-name">Admin</div>
          <div class="user-role">超级管理员</div>
        </div>
      </div>

      <!-- 登录信息 -->
      <div class="card">
        <div class="info-row">
          <span class="info-label">1.上次登录时间:</span>
          <span class="info-value">2021-7-18</span>
        </div>
        <div class="info-row">
          <span class="info-label">1.上次登录ip:</span>
          <span class="info-value">测试</span>
        </div>
      </div>

      <!-- 品牌销量表格 -->
      <div class="card table-card">
        <el-table :data="tableData" size="small" style="width: 100%">
          <el-table-column prop="brand" label="品牌" />
          <el-table-column prop="today" label="今日销量" />
          <el-table-column prop="month" label="本月销量" />
          <el-table-column prop="total" label="总销量" />
        </el-table>
      </div>
    </div>

    <!-- 右侧栏 -->
    <div class="home-right">
      <!-- 数据统计卡片 -->
      <div class="stat-list">
        <div v-for="(item, index) in statCards" :key="index" class="card stat-card">
          <div class="stat-icon" :style="{ backgroundColor: item.bg }">
            <el-icon><component :is="item.icon" /></el-icon>
          </div>
          <div class="stat-text">
            <div class="stat-value">￥ {{ item.value }}</div>
            <div class="stat-label">{{ item.label }}</div>
          </div>
        </div>
      </div>

      <!-- 折线图 -->
      <div class="card chart-card">
        <div ref="lineRef" class="chart chart-line"></div>
      </div>

      <!-- 柱状图 + 饼图 -->
      <div class="chart-group">
        <div class="card chart-card">
          <div ref="barRef" class="chart"></div>
        </div>
        <div class="card chart-card">
          <div ref="pieRef" class="chart"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.home-page {
  display: flex;
  gap: 10px;
  padding: 10px;
}

.card {
  background-color: #fff;
  border-radius: 4px;
  padding: 12px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.06);
}

.home-left {
  flex: 0 0 210px;
}

.home-right {
  flex: 1;
  min-width: 0;
}

/* 用户卡片 */
.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.user-avatar {
  background-color: #409eff;
  font-size: 24px;
}

.user-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.user-role {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

/* 登录信息 */
.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
  line-height: 24px;
}

.info-value {
  color: #606266;
}

/* 表格卡片 */
.table-card {
  padding: 4px;
  margin-top: 10px;
  overflow-x: auto;
}

/* 统计卡片 */
.stat-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 10px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  color: #fff;
  font-size: 18px;
  flex-shrink: 0;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.stat-label {
  margin-top: 2px;
  font-size: 12px;
  color: #909399;
}

/* 图表 */
.chart-card {
  margin-bottom: 10px;
}

.chart {
  width: 100%;
  height: 260px;
}

.chart-line {
  height: 280px;
}

.chart-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

/* 窄屏适配 */
@media (max-width: 1100px) {
  .home-page {
    flex-direction: column;
  }

  .home-left {
    flex: none;
    width: 100%;
  }

  .stat-list {
    grid-template-columns: repeat(2, 1fr);
  }

  .chart-group {
    grid-template-columns: 1fr;
  }
}
</style>
