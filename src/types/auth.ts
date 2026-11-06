import type { StorageFile } from '@/api/file'
import type { PermissionVO } from './permission'

export interface UserInfo {
  userId: number
  username: string
  nickname: string
  avatar?: StorageFile | null
  roles: string[]
  permissions: string[]
  menus: PermissionVO[]
}
