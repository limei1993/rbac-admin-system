<template>
  <div class="menu-auth">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">角色菜单授权</span>
          <span class="desc">
            勾选菜单与按钮权限并保存后，该角色刷新页面即可看到对应菜单、获得对应操作权限。
            <br />
            说明：子项被勾选时，服务端会自动把它所在的父级一起授权，保证菜单树完整；
            按钮只控制操作权限（新增 / 编辑 / 删除等），不会出现在侧边栏。
          </span>
        </div>
      </template>

      <el-row :gutter="16">
        <!-- 左侧：角色列表 -->
        <el-col :xs="24" :sm="8" :md="7">
          <div class="role-list">
            <div
              v-for="role in roles"
              :key="role.id"
              class="role-item"
              :class="{ 'is-active': role.id === currentRoleId }"
              @click="handleRoleChange(role.id)"
            >
              <div class="role-name">{{ role.name }}</div>
              <div class="role-desc">{{ role.description || '—' }}</div>
              <div class="role-count">已授权 {{ role.menuIds.length }} 项</div>
            </div>

            <el-empty
              v-if="!roles.length && !loading"
              description="暂无角色"
              :image-size="60"
            />
          </div>
        </el-col>

        <!-- 右侧：菜单树 -->
        <el-col :xs="24" :sm="16" :md="17">
          <div v-loading="loading" class="tree-wrap">
            <el-tree
              ref="treeRef"
              :data="allMenus"
              show-checkbox
              node-key="id"
              check-strictly
              :props="{ label: 'name', children: 'children' }"
              :default-expanded-keys="expandedKeys"
              class="menu-tree"
            >
              <!-- 自定义节点：标出类型，并把权限标识显示出来 -->
              <template #default="{ data }">
                <span class="tree-node">
                  <span class="node-name">{{ data.name }}</span>
                  <el-tag v-if="data.type === 'button'" type="warning" size="small">按钮</el-tag>
                  <el-tag v-else-if="data.type === 'directory'" type="info" size="small">目录</el-tag>
                  <code v-if="data.perm" class="perm-code">{{ data.perm }}</code>
                </span>
              </template>
            </el-tree>
          </div>

          <div class="actions">
            <el-button size="small" @click="handleCheckAll">全选</el-button>
            <el-button size="small" @click="handleClear">清空</el-button>
            <el-button size="small" @click="handleRefresh">刷新</el-button>
            <el-button
              v-perm="'sys:role:assign'"
              type="primary"
              size="small"
              :loading="saving"
              @click="handleSave"
            >
              保存
            </el-button>
          </div>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { assignRoleMenus, getAllMenus, getRoleMenus } from '@/api/menu'

// 角色列表：[{ id, name, description, menuIds }]
const roles = ref([])
// 全部菜单树
const allMenus = ref([])
// 当前正在授权的角色 ID
const currentRoleId = ref(null)
// el-tree 实例
const treeRef = ref()

const loading = ref(false)
const saving = ref(false)

const currentRole = computed(() => roles.value.find((r) => r.id === currentRoleId.value))

// 默认展开所有父级，让管理员一眼看清整棵树
const expandedKeys = computed(() => {
  const keys = []
  const walk = (list) => {
    list.forEach((item) => {
      if (item.children && item.children.length) {
        keys.push(item.id)
        walk(item.children)
      }
    })
  }
  walk(allMenus.value)
  return keys
})

const loadData = async () => {
  loading.value = true
  try {
    // 两个接口并行拉
    const [menuRes, roleRes] = await Promise.all([getAllMenus(), getRoleMenus()])
    allMenus.value = menuRes.data || []
    roles.value = roleRes.data || []

    // 默认选中第一个角色
    if (roles.value.length) {
      await selectRole(roles.value[0].id)
    }
  } catch (e) {
    // handled 标记表示错误已被 request 拦截器提示过
    if (!e.handled) {
      ElMessage.error(e.message || '加载失败')
    }
  } finally {
    loading.value = false
  }
}

/**
 * 切换到某个角色，把该角色已授权的菜单勾上
 */
const selectRole = async (roleId) => {
  currentRoleId.value = roleId
  // 等 DOM 更新后再设置勾选状态
  await nextTick()
  const role = roles.value.find((r) => r.id === roleId)
  // 用 setCheckedKeys 而不是 default-checked-keys：
  // 后者只在初始化时生效，切换角色时不会重新应用
  treeRef.value?.setCheckedKeys(role?.menuIds || [])
}

const handleRoleChange = (roleId) => {
  selectRole(roleId)
}

const handleCheckAll = () => {
  const keys = []
  const walk = (list) => {
    list.forEach((item) => {
      keys.push(item.id)
      if (item.children && item.children.length) {
        walk(item.children)
      }
    })
  }
  walk(allMenus.value)
  treeRef.value?.setCheckedKeys(keys)
}

const handleClear = () => {
  treeRef.value?.setCheckedKeys([])
}

const handleRefresh = async () => {
  await loadData()
  ElMessage.success('已刷新')
}

const handleSave = async () => {
  if (!currentRoleId.value) {
    ElMessage.warning('请先选择角色')
    return
  }

  saving.value = true
  try {
    // check-strictly 模式下，getCheckedKeys 就是被勾选的节点
    const menuIds = treeRef.value.getCheckedKeys()
    const res = await assignRoleMenus(currentRoleId.value, menuIds)

    // 服务端会自动补上「被勾选子菜单的父级」，
    // 这里把补齐后的结果同步回勾选状态，
    // 否则界面显示「父级没勾」而库里其实已授权，两边对不上
    const savedIds = res.data?.menuIds || menuIds
    treeRef.value?.setCheckedKeys(savedIds)

    ElMessage.success('保存成功，该角色刷新页面后即可看到新菜单、获得对应操作权限')

    // 重新拉一次角色列表，刷新「已授权 N 项」的计数
    const roleRes = await getRoleMenus()
    roles.value = roleRes.data || []
  } catch (e) {
    if (!e.handled) {
      ElMessage.error(e.message || '保存失败')
    }
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
</script>

<style lang="less" scoped>
.menu-auth {
  padding: 10px;
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  .desc {
    font-size: 12px;
    font-weight: 400;
    color: #909399;
    line-height: 1.6;
  }
}

.role-list {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.role-item {
  padding: 12px 14px;
  border-bottom: 1px solid #ebeef5;
  cursor: pointer;
  transition: background-color 0.2s;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: #f5f7fa;
  }

  &.is-active {
    background-color: #ecf5ff;
    box-shadow: inset 3px 0 0 #409eff;
  }

  .role-name {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }

  .role-desc {
    margin-top: 4px;
    font-size: 12px;
    color: #909399;
  }

  .role-count {
    margin-top: 6px;
    font-size: 12px;
    color: #409eff;
  }
}

.tree-wrap {
  min-height: 320px;
  max-height: 520px;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.actions {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 6px;

  .node-name {
    font-size: 13px;
  }
}

.perm-code {
  padding: 1px 5px;
  border-radius: 3px;
  background-color: #fdf6ec;
  color: #b88230;
  font-family: Menlo, Consolas, monospace;
  font-size: 12px;
}
</style>
