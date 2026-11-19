<template>
  <div class="page-card">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>用户管理</span>
        </div>
      </template>

      <!-- 操作栏：新增 + 搜索 -->
      <!-- 新增 / 编辑 / 删除都是管理员专属操作：
           前端隐藏按钮只是展示层优化，
           真正的权限边界在后端 rbac 中间件，普通用户直接调接口会返回 403 -->
      <div class="toolbar">
        <el-button v-if="userStore.isAdmin" type="primary" :icon="Plus" @click="openAdd">新增</el-button>
        <div class="search">
          <el-input
            v-model="searchName"
            placeholder="请输入 请输入用户名"
            clearable
            :prefix-icon="Search"
            @keyup.enter="handleSearch"
          />
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
        </div>
      </div>

      <!-- 用户表格 -->
      <el-table :data="list" border style="width: 100%">
        <el-table-column prop="name" label="姓名" width="160" />
        <el-table-column prop="age" label="年龄" width="120" />
        <el-table-column prop="sexlabel" label="性别" width="120" />
        <el-table-column label="出生日期" min-width="160">
          <template #default="{ row }">{{ (row.birth || '').slice(0, 10) }}</template>
        </el-table-column>
        <el-table-column prop="addr" label="地址" min-width="220" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button v-if="userStore.isAdmin" link type="primary" @click="openEdit(row)">编辑</el-button>
            <!-- 删除是管理员专属操作：前端隐藏按钮只是展示层优化，
                 真正的权限边界在后端 rbac 中间件，普通用户直接调接口会返回 403 -->
            <el-button v-if="userStore.isAdmin" link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        class="pagination"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 30]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSizeChange"
        @current-change="loadList"
      />
    </el-card>

    <!-- 新增 / 编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑用户' : '新增用户'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="年龄" prop="age">
          <el-input-number v-model="form.age" :min="1" :max="120" />
        </el-form-item>
        <el-form-item label="性别" prop="sexlabel">
          <el-radio-group v-model="form.sexlabel">
            <el-radio label="男">男</el-radio>
            <el-radio label="女">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="出生日期" prop="birth">
          <el-date-picker
            v-model="form.birth"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="地址" prop="addr">
          <el-input v-model="form.addr" placeholder="请输入地址" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { getUsers, addUser, updateUser, deleteUser } from '@/api/user'
import { useUserStore } from '@/stores'

// 登录态：用于按角色控制按钮的显示（真正的权限校验在后端）
const userStore = useUserStore()

// ============ 分页 / 搜索状态 ============
const currentPage = ref(1)
const pageSize = ref(10)
const searchName = ref('')

// ============ 列表数据（来自接口 listAll：GET /api/users，服务端分页） ============
const list = ref([])
const total = ref(0)

const loadList = async () => {
  try {
    const res = await getUsers({
      page: currentPage.value,
      pagesize: pageSize.value,
      name: searchName.value.trim()
    })
    // 后端返回 { code, data: { list, count }, total }
    list.value = res.data?.list || []
    total.value = res.data?.count || 0
  } catch (e) {
    // 失败提示已由 request 拦截器统一处理
  }
}
onMounted(loadList)

const handleSearch = () => {
  currentPage.value = 1
  loadList()
}

// 每页条数变化：重新按新的 pagesize 拉一次
// 注意不要再手动改 currentPage，否则会和 @current-change 触发重复请求
const handleSizeChange = () => {
  loadList()
}

// ============ 新增 / 编辑 ============
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const form = ref({ id: null, name: '', age: 18, sexlabel: '男', birth: '', addr: '' })

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  age: [{ required: true, message: '请输入年龄', trigger: 'blur' }],
  sexlabel: [{ required: true, message: '请选择性别', trigger: 'change' }]
}

const openAdd = () => {
  isEdit.value = false
  form.value = { id: null, name: '', age: 18, sexlabel: '男', birth: '', addr: '' }
  dialogVisible.value = true
}

const openEdit = (row) => {
  isEdit.value = true
  // 接口返回的 birth 带时分（YYYY-MM-DD HH:mm），日期选择器需要纯日期
  form.value = { ...row, birth: (row.birth || '').slice(0, 10) }
  dialogVisible.value = true
}

const submit = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    if (isEdit.value) {
      // 调用后端 update 接口：PUT /users/:id
      // 只提交表单里可编辑的字段，不把 createdAt / updatedAt 一起传回去
      const { id, name, age, sexlabel, birth, addr } = form.value
      try {
        const res = await updateUser({ id, name, age, sexlabel, birth, addr })
        ElMessage.success(res.data || '修改成功')
        dialogVisible.value = false
        loadList() // 重新拉取，拿到数据库里的最新值
      } catch (e) {
        // 失败提示已由 request 拦截器统一处理
      }
    } else {
      // 调用后端 add 接口：POST /users
      const { name, age, sexlabel, birth, addr } = form.value
      try {
        const res = await addUser({ name, age, sexlabel, birth, addr })
        ElMessage.success(res.data || '新增成功')
        dialogVisible.value = false
        loadList()
      } catch (e) {
        // 失败提示已由 request 拦截器统一处理
      }
    }
  })
}

// ============ 删除 ============
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除用户「${row.name}」吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      // 调用后端 delete 接口：DELETE /users/:id
      try {
        const res = await deleteUser(row.id)
        ElMessage.success(res.data || '删除成功')
        // 当前页只剩这一条且不是第一页 → 回退一页（current-change 会自动触发 loadList）
        if (list.value.length === 1 && currentPage.value > 1) {
          currentPage.value -= 1
        } else {
          loadList()
        }
      } catch (e) {
        // 失败提示已由 request 拦截器统一处理
      }
    })
    .catch(() => {})
}
</script>

<style lang="less" scoped>
.page-card {
  padding: 10px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toolbar {
  display: flex;
  align-items: center;
  // 靠右排：普通用户没有「新增」按钮时，搜索框不会孤零零贴在左边
  justify-content: flex-end;
  gap: 12px;
  margin-bottom: 16px;
}

.search {
  display: flex;
  align-items: center;
  gap: 8px;

  .el-input {
    width: 240px;
  }
}

.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
