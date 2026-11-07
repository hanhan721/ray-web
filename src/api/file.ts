import { get, post, del } from '@/utils/request'
import type { RequestConfig } from '@/types/request'

/** 上传和详情返回的逻辑文件。`url` 是浏览用的签名地址，不包含存储位置。 */
export interface FileUpload {
  fileId: number
  fileName: string
  ext: string
  size: number
  contentType: string
  url: string
}

/** 批量上传的单项结果。某一项失败时，其他成功项仍然保留。 */
export interface FileBatchItem {
  index: number
  originalName?: string | null
  ok: boolean
  data?: FileUpload | null
  errorCode?: string | null
  reason?: string | null
}

/**
 * 上传一个未绑定文件。
 * 归属只能由业务接口建立，这里不提交业务类型。
 */
export function uploadFile(file: File, config?: RequestConfig) {
  const formData = new FormData()
  formData.append('file', file)
  return post<FileUpload>('/sys/file', formData, config)
}

/** 按选择顺序批量上传。空列表由服务端拒绝。 */
export function uploadFiles(files: File[], config?: RequestConfig) {
  const formData = new FormData()
  files.forEach((item) => formData.append('files', item))
  return post<FileBatchItem[]>('/sys/file/batch', formData, config)
}

/** 查询当前调用者可以访问的文件详情。 */
export function getFileById(id: number, config?: RequestConfig) {
  return get<FileUpload>(`/sys/file/${id}`, undefined, config)
}

/** 重新签发浏览地址。下载用途只有 302，浏览器不能读取跳转目标。 */
export function getFileUrl(id: number, config?: RequestConfig) {
  return get<string>(`/sys/file/${id}/url`, undefined, config)
}

/** 整批逻辑删除。任一文件仍有业务引用时，服务端拒绝整批。 */
export function deleteFiles(ids: number[], config?: RequestConfig) {
  return del<void>('/sys/file', ids, config)
}
