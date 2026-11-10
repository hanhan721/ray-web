import { shallowRef } from 'vue'
import { getUserPage, type SysUser } from '@/api/user'
import { usePagedList } from '@/composables/usePagedList'
import { QUIET } from '@/utils/failure'
import { toUserQuery, type UserListInput } from './user-table'

/** 用户列表把筛选条件留在页面，分页与勾选交给通用列表。 */
export function useUserList() {
  const username = shallowRef('')
  const nickname = shallowRef('')
  const enabled = shallowRef<UserListInput['enabled']>('')

  const list = usePagedList<SysUser>({
    fetchPage: (input) =>
      getUserPage(
        toUserQuery({
          pageIndex: input.pageIndex,
          pageSize: input.pageSize,
          username: username.value,
          nickname: nickname.value,
          enabled: enabled.value,
        }),
        QUIET,
      ),
    fallbackMessage: '用户列表加载失败',
  })

  return { ...list, username, nickname, enabled }
}
