import type { PermissionVO } from './permission'

export interface UserInfo {
  userId: number
  username: string
  nickname: string
  avatarFileId?: number | null
  roles: string[]
  permissions: string[]
  menus: PermissionVO[]
}
