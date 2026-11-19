<template>
  <div class="page-card">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>菜单管理</span>
          <span class="card-tip">
            这里管理的是「菜单表本身」。改完记得去「角色授权」页把菜单分配给角色。
          </span>
        </div>
      </template>

      <!-- 操作栏 -->
      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="openAdd()">新增菜单</el-button>
        <el-button :icon="Refresh" @click="loadList">刷新</el-button>
      </div>

      <!-- 菜单表格（树形） -->
      <el-table
        v-loading="loading"
        :data="menus"
        row-key="id"
        border
        default-expand-all
        style="width: 100%"
      >
        <el-table-column prop="name" label="菜单名称" min-width="220">
          <template #default="{ row }">
            <div class="menu-name">
              <el-icon v-if="row.icon" class="menu-icon">
                <component :is="row.icon" />
              </el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="path" label="菜单路径" min-width="200">
          <template #default="{ row }">
            <span :class="{ 'path-invalid': !isValidPath(row.path) }">
              {{ row.path }}
            </span>
            <el-tooltip
              v-if="!isValidPath(row.path)"
              content="这个路径在前端路由表里不存在，点击菜单会进入空白页，建议重新选择"
              placement="top"
            >
              <el-icon class="warn-icon"><WarningFilled /></el-icon>
            </el-tooltip>
          </template>
        </el-table-column>

        <el-table-column label="上级菜单" min-width="140">
          <template #default="{ row }">{{ parentName(row.parentId) }}</template>
        </el-table-column>

        <el-table-column prop="sort" label="排序" width="90" align="center" />

        <el-table-column label="是否显示" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="row.visible ? 'success' : 'info'" size="small">
              {{ row.visible ? '显示' : '隐藏' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openAdd(row)">新增子级</el-button>
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增 / 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="560px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="上级菜单">
          <el-tree-select
            v-model="form.parentId"
            :data="parentOptions"
            :props="{ label: 'name', children: 'children' }"
            node-key="id"
            value-key="id"
            check-strictly
            clearable
            placeholder="不选则为顶级菜单"
            style="width: 100%"
          />
          <div class="form-tip">顶级菜单的父级为 0；子菜单会自动继承父级的显示状态</div>
        </el-form-item>

        <el-form-item label="菜单名称" prop="name">
          <el-input v-model="form.name" placeholder="例如：订单管理" />
        </el-form-item>

        <el-form-item label="菜单路径" prop="path">
          <el-select
            v-model="form.path"
            filterable
            placeholder="请选择前端已有的路由"
            style="width: 100%"
          >
            <el-option
              v-for="item in pathOptions"
              :key="item.path"
              :label="`${item.label}  (${item.path})`"
              :value="item.path"
            />
          </el-select>
          <div class="form-tip">
            只能选择前端路由表里已存在的路径，否则点菜单会进空白页
          </div>
        </el-form-item>

        <el-form-item label="图标">
          <el-select v-model="form.icon" filterable clearable placeholder="请选择图标" style="width: 100%">
            <el-option v-for="name in ICON_OPTIONS" :key="name" :label="name" :value="name">
              <div class="icon-option">
                <el-icon><component :is="name" /></el-icon>
                <span>{{ name }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :max="999" />
          <span class="form-tip form-tip--inline">数字越小越靠前</span>
        </el-form-item>

        <el-form-item label="是否显示">
          <el-switch v-model="form.visible" />
          <span class="form-tip form-tip--inline">
            隐藏后整棵子树都不显示
          </span>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, WarningFilled } from '@element-plus/icons-vue'
import { createMenu, deleteMenu, getAllMenus, updateMenu } from '@/api/menu'
import { menuPathOptions } from '@/router/routes'
import { useMenuStore } from '@/stores'

// 菜单缓存：新增/删除菜单后要刷新侧边栏
const menuStore = useMenuStore()

// ============ 列表 ============
const menus = ref([])
const loading = ref(false)

const loadList = async () => {
  loading.value = true
  try {
    const res = await getAllMenus()
    menus.value = res.data || []
  } catch (e) {
    // 失败提示已由 request 拦截器统一处理
  } finally {
    loading.value = false
  }
}
onMounted(loadList)

// ============ 路径选项（来自前端路由表） ============
const pathOptions = computed(() => menuPathOptions)

// 判断菜单路径在前端路由表里是否还存在
const validPaths = computed(() => new Set(menuPathOptions.map((item) => item.path)))
const isValidPath = (path) => validPaths.value.has(path)

// ============ 上级菜单名称 ============
const parentNameMap = computed(() => {
  const map = new Map()
  const walk = (list) => {
    list.forEach((item) => {
      map.set(item.id, item.name)
      if (item.children && item.children.length) walk(item.children)
    })
  }
  walk(menus.value)
  return map
})
const parentName = (parentId) => {
  if (!parentId) return '顶级菜单'
  return parentNameMap.value.get(parentId) || '（已删除）'
}

// ============ 图标候选 ============
const ICON_OPTIONS = [
  'HomeFilled', 'Goods', 'User', 'Grid', 'List', 'FolderOpened', 'Folder',
  'Setting', 'Tools', 'Document', 'Menu', 'Lock', 'DataAnalysis', 'PieChart',
  'Collection', 'Histogram', 'PriceTag', 'ShoppingCart', 'Box', 'Star',
  'Bell', 'Monitor', 'Service', 'Coin'
]

// ============ 新增 / 编辑 ============
const dialogVisible = ref(false)
const saving = ref(false)
const formRef = ref()
const isEdit = ref(false)
// parentId 用 null 表示「顶级菜单」
// （不能直接用 0，el-tree-select 找不到 id=0 的节点会显示成 "0"）
const form = ref({
  id: null,
  parentId: null,
  name: '',
  path: '',
  icon: '',
  sort: 0,
  visible: true
})

const dialogTitle = computed(() => (isEdit.value ? '编辑菜单' : '新增菜单'))

const rules = {
  name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  path: [{ required: true, message: '请选择菜单路径', trigger: 'change' }]
}

/**
 * 上级菜单候选项
 * 编辑时要把「自己」和「自己的所有子孙」排除掉，
 * 否则会出现「把自己挂到自己的子菜单下」这种会成环的非法操作
 */
const parentOptions = computed(() => {
  if (!isEdit.value || !form.value.id) return menus.value

  // 找出自己 + 自己的子孙
  const banned = new Set()
  const collect = (node) => {
    banned.add(node.id)
    ;(node.children || []).forEach(collect)
  }
  const findSelf = (list) => {
    for (const item of list) {
      if (item.id === form.value.id) {
        collect(item)
        return true
      }
      if (findSelf(item.children || [])) return true
    }
    return false
  }
  findSelf(menus.value)

  // 过滤掉被排除的节点，并去掉空的 children（否则树选择器会显示成"有子节点"）
  const filter = (list) =>
    list
      .filter((item) => !banned.has(item.id))
      .map((item) => {
        const copy = { ...item }
        const children = filter(item.children || [])
        if (children.length) {
          copy.children = children
        } else {
          delete copy.children
        }
        return copy
      })

  return filter(menus.value)
})

const openAdd = (parent) => {
  isEdit.value = false
  form.value = {
    id: null,
    // 从某一行点「新增子级」时，直接把上级菜单带过来
    parentId: parent ? parent.id : null,
    name: '',
    path: '',
    icon: '',
    sort: 0,
    visible: true
  }
  dialogVisible.value = true
}

const openEdit = (row) => {
  isEdit.value = true
  form.value = {
    id: row.id,
    // 顶级菜单的 parentId 是 0，转成 null 才能显示 placeholder
    parentId: row.parentId || null,
    name: row.name,
    path: row.path,
    icon: row.icon || '',
    sort: row.sort,
    visible: row.visible
  }
  dialogVisible.value = true
}

const submit = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) return

    const payload = {
      name: form.value.name.trim(),
      path: form.value.path,
      icon: form.value.icon || '',
      // 上级没选 = 顶级菜单
      parentId: form.value.parentId || 0,
      sort: form.value.sort || 0,
      visible: form.value.visible
    }

    saving.value = true
    try {
      if (isEdit.value) {
        await updateMenu({ id: form.value.id, ...payload })
        ElMessage.success('修改成功')
      } else {
        await createMenu(payload)
        ElMessage.success('新增成功')
      }
      dialogVisible.value = false
      loadList()
      // 刷新侧边栏菜单，让新菜单立刻出现在导航里
      await menuStore.loadMenus(true)
    } catch (e) {
      // 失败提示已由 request 拦截器统一处理
    } finally {
      saving.value = false
    }
  })
}

// ============ 删除 ============
const handleDelete = (row) => {
  const hasChildren = row.children && row.children.length
  const tip = hasChildren
    ? `删除「${row.name}」会同时删除它下面的 ${row.children.length} 个子菜单，以及所有角色对这些菜单的授权记录，确定吗？`
    : `确定删除菜单「${row.name}」吗？`

  ElMessageBox.confirm(tip, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      try {
        const res = await deleteMenu(row.id)
        ElMessage.success(res.msg || '删除成功')
        loadList()
        await menuStore.loadMenus(true)
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

.card-tip {
  color: #909399;
  font-size: 12px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.menu-name {
  display: flex;
  align-items: center;
  gap: 6px;
}

.menu-icon {
  color: #409eff;
}

.path-invalid {
  color: #f56c6c;
  text-decoration: line-through;
}

.warn-icon {
  margin-left: 4px;
  color: #e6a23c;
  vertical-align: middle;
}

.form-tip {
  color: #909399;
  font-size: 12px;
  line-height: 1.6;

  &--inline {
    margin-left: 10px;
  }
}

.icon-option {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
