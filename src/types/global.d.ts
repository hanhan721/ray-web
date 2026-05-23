/**
 * 全局类型声明
 * 与后端 ray-boot API 响应格式保持一致
 */

// ===== API 响应 =====

/** 通用响应结构 */
declare interface R<T = unknown> {
  code: number // 200=成功, 401=未登录, 403=无权限, 555=业务错误
  msg: string
  data: T
}

/** 分页响应结构（MyBatis-Plus IPage） */
declare interface IPage<T> {
  current: number // 当前页码
  size: number // 每页条数
  total: number // 总记录数
  pages: number // 总页数
  records: T[] // 数据列表
}

// ===== 分页查询 =====

/** 分页查询参数 */
declare interface PageQuery {
  pageNum?: number // 页码，默认1
  pageSize?: number // 每页条数，默认10，最大100
  orderBy?: string // 排序字段
  asc?: boolean // 是否升序，默认true
}

// ===== 工具类型 =====

/** 树形结构 */
declare type WithChildren<T> = T & { children?: WithChildren<T>[] }

/** 表单类型（去除只读字段） */
declare type FormType<T> = Partial<Omit<T, 'id' | 'createTime' | 'updateTime' | 'createBy' | 'updateBy'>>

/** ID 集合（用于批量删除） */
declare type IdSet = Set<number>

// ===== 列配置 =====

/** 单列用户配置项（对应后端 user-column-config API） */
declare interface ColumnConfigItem {
  key: string
  visible: boolean
  sort: number
  width: number | null
  fixed: 'left' | 'right' | null
}
