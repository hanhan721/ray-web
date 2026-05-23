import type { VNode } from 'vue'
import type { DataTableColumn } from 'naive-ui'
import type { SearchFormItem } from '../SearchForm.vue'

/**
 * ProTable 列配置
 */
export interface ProTableColumn<T = Record<string, unknown>> {
  /** 列键值 */
  key: string
  /** 列标题 */
  title: string
  /** 列宽度 */
  width?: number
  /** 最小宽度 */
  minWidth?: number
  /** 固定列 */
  fixed?: 'left' | 'right'
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right'
  /** 是否可排序 */
  sorter?: boolean
  /** 是否省略 */
  ellipsis?: boolean

  // 表格渲染相关
  /** 自定义渲染函数 */
  render?: (row: T, index: number) => VNode | string | number
  /** 字典类型，自动使用 DictTag 渲染 */
  dictType?: string

  // 搜索相关
  /** 是否可搜索，true 时使用默认配置，对象时使用自定义配置 */
  search?: boolean | Partial<SearchFormItem>
  /** 是否在表格中隐藏 */
  hideInTable?: boolean
  /** 锁定列：在列设置抽屉中置灰不可操作，始终保持可见，fixed 保持原定义不受用户修改 */
  configLocked?: boolean
  /** 权限码：无对应权限时该列不渲染（含搜索项和列设置）。支持单个或多个（OR 逻辑） */
  permission?: string | string[]
}

/**
 * 分页请求参数
 */
export interface ProTableRequestParams {
  /** 当前页 */
  pageNum: number
  /** 每页条数 */
  pageSize: number
  /** 排序字段 */
  orderBy?: string
  /** 是否升序 */
  asc?: boolean
  /** 搜索参数 */
  [key: string]: unknown
}

/**
 * 分页响应数据
 */
export interface ProTablePageResult<T> {
  /** 数据列表 */
  records: T[]
  /** 总条数 */
  total: number
  /** 当前页 */
  current: number
  /** 每页条数 */
  size: number
  /** 总页数 */
  pages: number
}

/**
 * 请求函数类型
 */
export type ProTableRequest<T> = (params: ProTableRequestParams) => Promise<ProTablePageResult<T>>

/**
 * ProTable Props
 */
export interface ProTableProps<T = Record<string, unknown>> {
  /** 列配置 */
  columns: ProTableColumn<T>[]
  /** 数据请求函数 */
  request: ProTableRequest<T>
  /** 行键 */
  rowKey?: string | ((row: T) => string | number)
  /** 是否显示边框 */
  bordered?: boolean
  /** 是否显示序号列 */
  showIndex?: boolean
  /** 是否显示复选框列 */
  showSelection?: boolean
  /** 是否显示工具栏 */
  showToolbar?: boolean
  /** 默认每页条数 */
  defaultPageSize?: number
  /** 是否立即加载 */
  immediate?: boolean
}

/**
 * ProTable 暴露的方法
 */
export interface ProTableExpose {
  /** 刷新数据 */
  refresh: () => Promise<void>
  /** 重置并刷新 */
  reset: () => Promise<void>
  /** 获取选中行数据 */
  getSelectedRows: () => unknown[]
  /** 获取选中行的 key 列表 */
  getCheckedKeys: () => Array<string | number>
  /** 清空选中 */
  clearSelection: () => void
  /** 获取搜索参数 */
  getSearchParams: () => Record<string, unknown>
}
