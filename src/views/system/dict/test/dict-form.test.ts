import { describe, expect, it } from 'vitest'
import {
  dictDataFormError,
  dictTypeFormError,
  toDataQuery,
  toDictDataWrite,
  toDictTypeWrite,
  toTypeQuery,
} from '@/views/system/dict/dict-form'

describe('dict form', () => {
  it('builds queries without empty filters and keeps cleared remarks', () => {
    expect(
      toTypeQuery({
        pageIndex: 0,
        pageSize: 10,
        dictName: ' 性别 ',
        dictType: '',
        enabled: '',
      }),
    ).toEqual({ pageNum: 1, pageSize: 10, dictName: '性别' })
    expect(
      toDataQuery({
        pageIndex: 1,
        pageSize: 20,
        dictType: 'sys_user_sex',
        dictLabel: '',
        enabled: 'false',
      }),
    ).toEqual({ pageNum: 2, pageSize: 20, dictType: 'sys_user_sex', enabled: false })
    expect(dictTypeFormError({ dictName: '', dictType: 'a', remark: '' })).toBe('请填写名称')
    expect(dictTypeFormError({ dictName: '名'.repeat(101), dictType: 'a', remark: '' })).toBe(
      '名称不能超过 100 个字符',
    )
    expect(dictDataFormError({
      dictLabel: '男',
      dictValue: '',
      sort: 0,
      cssClass: '',
      listClass: '',
      remark: '',
    })).toBe('请填写字典值')
    expect(toDictTypeWrite({ id: 1, dictName: '性别', dictType: 'sex', enabled: true }).remark).toBe(
      '',
    )
    expect(
      toDictDataWrite({
        id: 2,
        dictType: 'sex',
        dictLabel: '男',
        dictValue: '1',
        sort: 1,
        enabled: true,
      }).remark,
    ).toBe('')
  })
})
