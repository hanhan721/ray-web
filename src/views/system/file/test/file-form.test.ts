import { describe, expect, it } from 'vitest'
import {
  classifyFiles,
  fileExtension,
  fileUploadError,
  formatFileSize,
} from '@/views/system/file/file-form'

function file(name: string, size = 4) {
  return { name, size }
}

describe('file upload checks', () => {
  it('accepts a normal name and rejects empty, oversized, and illegal names', () => {
    expect(fileExtension('报告.PDF')).toBe('pdf')
    expect(fileExtension('readme')).toBe('')
    expect(fileUploadError(file('笔记.txt'))).toBe('')
    expect(fileUploadError(file('空.txt', 0))).toBe('上传文件不能为空')
    expect(fileUploadError(file('大.txt', 50 * 1024 * 1024 + 1))).toBe('文件不能超过50MB')
    expect(fileUploadError(file('a/b.txt'))).toBe('文件名不合法或超过255个字符')
    expect(fileUploadError(file('脚本.TXT!'))).toBe('扩展名不合法或超过20个字符')
  })

  it('keeps valid files when another selected file is rejected', () => {
    const good = file('图.png')
    const empty = file('空.png', 0)
    expect(classifyFiles([good, empty])).toEqual({
      accepted: [good],
      rejected: [{ name: '空.png', reason: '上传文件不能为空' }],
    })
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })
})
