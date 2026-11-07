export const MAX_FILE_BYTES = 50 * 1024 * 1024

export interface UploadRejection {
  name: string
  reason: string
}

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot < 0 || dot === name.length - 1) return ''
  return name.slice(dot + 1).toLowerCase()
}

function hasControlCharacter(name: string): boolean {
  for (const char of name) {
    const code = char.codePointAt(0) ?? 0
    if (code <= 31 || (code >= 127 && code <= 159)) return true
  }
  return false
}

/** 与服务端上传前校验一致，避免明显非法的文件进入请求。 */
export function fileUploadError(file: { name: string; size: number }): string {
  if (file.size <= 0) return '上传文件不能为空'
  if (file.size > MAX_FILE_BYTES) return '文件不能超过50MB'
  const name = file.name
  if (
    !name.trim() ||
    name.length > 255 ||
    name.includes('/') ||
    name.includes('\\') ||
    hasControlCharacter(name)
  ) {
    return '文件名不合法或超过255个字符'
  }
  const extension = fileExtension(name)
  if (extension.length > 20 || (extension.length > 0 && !/^[a-z0-9_-]+$/.test(extension))) {
    return '扩展名不合法或超过20个字符'
  }
  return ''
}

export function classifyFiles<T extends { name: string; size: number }>(
  files: T[],
): { accepted: T[]; rejected: UploadRejection[] } {
  const accepted: T[] = []
  const rejected: UploadRejection[] = []
  for (const file of files) {
    const reason = fileUploadError(file)
    if (reason) rejected.push({ name: file.name || '未命名文件', reason })
    else accepted.push(file)
  }
  return { accepted, rejected }
}

export function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
