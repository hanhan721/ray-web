/**
 * 通用枚举类型
 * 与后端 ray-boot 枚举保持一致
 */

// ===== 用户相关 =====

/** 性别 */
export type Gender = 'MALE' | 'FEMALE' | 'SECRET'

/** 性别选项（用于下拉框） */
export const GenderOptions = [
  { label: '男', value: 'MALE' },
  { label: '女', value: 'FEMALE' },
  { label: '保密', value: 'SECRET' },
] as const

/** 性别标签映射 */
export const GenderLabel: Record<Gender, string> = {
  MALE: '男',
  FEMALE: '女',
  SECRET: '保密',
}

// ===== 权限相关 =====

/** 权限类型 */
export type PermissionType = 'DIRECTORY' | 'MENU' | 'BUTTON'

/** 权限类型选项 */
export const PermissionTypeOptions = [
  { label: '目录', value: 'DIRECTORY' },
  { label: '菜单', value: 'MENU' },
  { label: '按钮', value: 'BUTTON' },
] as const

/** 权限类型标签映射 */
export const PermissionTypeLabel: Record<PermissionType, string> = {
  DIRECTORY: '目录',
  MENU: '菜单',
  BUTTON: '按钮',
}

// ===== 系统参数相关 =====

/** 参数类型 */
export type ParamType = 'STRING' | 'INTEGER' | 'BOOLEAN' | 'JSON' | 'STRING_LIST'

/** 参数类型选项 */
export const ParamTypeOptions = [
  { label: '字符串', value: 'STRING' },
  { label: '整数', value: 'INTEGER' },
  { label: '布尔值', value: 'BOOLEAN' },
  { label: 'JSON', value: 'JSON' },
  { label: '字符串列表', value: 'STRING_LIST' },
] as const

// ===== 通用状态 =====

/** 启用状态（用于 enabled 字段） */
export const EnabledOptions = [
  { label: '启用', value: true },
  { label: '禁用', value: false },
] as const

/** 启用状态筛选（查询参数使用字符串值） */
export const EnabledFilterOptions = [
  { value: 'true', label: '启用' },
  { value: 'false', label: '停用' },
] as const

/** 是否选项 */
export const BooleanOptions = [
  { label: '是', value: true },
  { label: '否', value: false },
] as const

// ===== API 响应码 =====

/** 响应码 */
export const ResponseCode = {
  SUCCESS: 200,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  BUSINESS_ERROR: 555,
} as const

export type ResponseCodeType = (typeof ResponseCode)[keyof typeof ResponseCode]

// ===== 页面标识 =====

/** 列配置 pageKey 常量（格式：模块:页面） */
export const PAGE_KEYS = {
  SYS_USER: 'sys:user',
  SYS_ROLE: 'sys:role',
  SYS_DEPT: 'sys:dept',
  SYS_MENU: 'sys:menu',
  SYS_DICT: 'sys:dict',
  SYS_PARAM: 'sys:param',
  SYS_ONLINE: 'sys:online',
  SCHEDULE_JOB: 'schedule:job',
} as const

export type PageKey = (typeof PAGE_KEYS)[keyof typeof PAGE_KEYS]
