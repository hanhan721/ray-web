import { get, post, del } from '@/utils/request'
import type { RequestConfig } from '@/types/request'

/**
 * 获取文件访问 URL
 */
export function getFileUrl(filePath: string) {
  const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'
  return `${baseURL}/sys/file/download?filePath=${encodeURIComponent(filePath)}`
}

/**
 * 存储文件信息（@StorageFile 序列化结构）
 */
export interface StorageFile {
  path: string
  url: string
  name?: string | null
}

/**
 * 文件实体
 */
export interface SysFile {
  id: number
  originalName: string
  fileName: string
  filePath: string
  fileUrl: StorageFile
  fileExt: string
  fileSize: number
  contentType: string
  storageType: string
  bucket: string
  bizType?: string
  bizId?: number
  createTime: string
  updateTime: string
}

/**
 * 单文件上传
 */
export function uploadFile(file: File, bizType?: string, bizId?: number) {
  const formData = new FormData()
  formData.append('file', file)
  if (bizType) formData.append('bizType', bizType)
  if (bizId != null) formData.append('bizId', String(bizId))
  return post<SysFile>('/sys/file/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  } as RequestConfig)
}

/**
 * 批量上传
 */
export function uploadFiles(files: File[], bizType?: string, bizId?: number) {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  if (bizType) formData.append('bizType', bizType)
  if (bizId != null) formData.append('bizId', String(bizId))
  return post<SysFile[]>('/sys/file/upload/batch', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  } as RequestConfig)
}

/**
 * 文件下载
 */
export function downloadFile(filePath: string, bucket?: string) {
  return get<Blob>('/sys/file/download', { filePath, bucket }, {
    responseType: 'blob',
  } as RequestConfig)
}

/**
 * 获取文件详情
 */
export function getFileById(id: number) {
  return get<SysFile>(`/sys/file/${id}`)
}

/**
 * 删除文件
 */
export function deleteFiles(ids: number[]) {
  return del<void>('/sys/file', ids)
}
