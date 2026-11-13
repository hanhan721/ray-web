import { shallowRef } from 'vue'
import { getRolePage, type Role } from '@/api/role'
import { usePagedList } from '@/composables/usePagedList'
import { toRoleQuery, type RoleListInput } from './role-table'

/** 角色列表把筛选条件留在页面，分页与勾选交给通用列表。 */
export function useRoleList() {
  const roleName = shallowRef('')
  const roleKey = shallowRef('')
  const enabled = shallowRef<RoleListInput['enabled']>('')

  const list = usePagedList<Role>({
    fetchPage: (input) =>
      getRolePage(
        toRoleQuery({
          pageIndex: input.pageIndex,
          pageSize: input.pageSize,
          roleName: roleName.value,
          roleKey: roleKey.value,
          enabled: enabled.value,
        }),
      ),
    fallbackMessage: '角色列表加载失败',
  })

  return { ...list, roleName, roleKey, enabled }
}
