import { describe, expect, it } from 'vitest'
import {
  paramFormError,
  toParamCreate,
  toParamQuery,
  toParamUpdate,
} from '@/views/system/param/param-form'

describe('param form', () => {
  it('keeps zero as a business type and omits empty filters', () => {
    expect(
      toParamQuery({ pageIndex: 0, pageSize: 10, bizType: '0', paramType: '' }),
    ).toEqual({ pageNum: 1, pageSize: 10, bizType: 0 })
    expect(
      toParamQuery({ pageIndex: 1, pageSize: 20, bizType: '', paramType: 'JSON' }),
    ).toEqual({ pageNum: 2, pageSize: 20, paramType: 'JSON' })
  })

  it('blocks invalid values, long keys, and clearing a description', () => {
    expect(
      paramFormError({
        creating: true,
        paramKey: '',
        paramValue: '1',
        paramType: 'STRING',
        description: '',
        originalDescription: '',
      }),
    ).toBe('请填写参数键')
    expect(
      paramFormError({
        creating: true,
        paramKey: 'k'.repeat(65),
        paramValue: '1',
        paramType: 'STRING',
        description: '',
        originalDescription: '',
      }),
    ).toBe('参数键不能超过 64 个字符')
    expect(
      paramFormError({
        creating: false,
        paramKey: 'sys.max',
        paramValue: '1.5',
        paramType: 'INTEGER',
        description: '',
        originalDescription: '',
      }),
    ).toBe('参数值无法转换为整数：1.5')
    expect(
      paramFormError({
        creating: false,
        paramKey: 'sys.max',
        paramValue: '+12',
        paramType: 'INTEGER',
        description: '',
        originalDescription: '',
      }),
    ).toBe('')
    expect(
      paramFormError({
        creating: false,
        paramKey: 'sys.max',
        paramValue: '2147483648',
        paramType: 'INTEGER',
        description: '',
        originalDescription: '',
      }),
    ).toBe('参数值无法转换为整数：2147483648')
    expect(
      paramFormError({
        creating: false,
        paramKey: 'sys.flag',
        paramValue: 'maybe',
        paramType: 'BOOLEAN',
        description: '',
        originalDescription: '',
      }),
    ).toBe('参数值无法转换为布尔值：maybe')
    expect(
      paramFormError({
        creating: false,
        paramKey: 'sys.json',
        paramValue: '{',
        paramType: 'JSON',
        description: '',
        originalDescription: '',
      }),
    ).toBe('参数值不是有效的 JSON：{')
    expect(
      paramFormError({
        creating: false,
        paramKey: 'sys.max',
        paramValue: '8',
        paramType: 'INTEGER',
        description: '',
        originalDescription: '原来的描述',
      }),
    ).toBe('描述暂时不能清空。')
  })

  it('omits an empty description and keeps a string value unchanged', () => {
    expect(
      toParamCreate({
        paramKey: 'sys.max',
        paramValue: ' 12 ',
        paramType: 'INTEGER',
        bizType: 0,
        encrypted: true,
        description: '',
      }),
    ).toEqual({
      paramKey: 'sys.max',
      paramValue: '12',
      paramType: 'INTEGER',
      bizType: 0,
      encrypted: true,
    })
    expect(
      toParamUpdate({
        id: 3,
        paramValue: ' a, b ',
        paramType: 'STRING_LIST',
        encrypted: false,
        description: '说明',
      }),
    ).toEqual({
      id: 3,
      paramValue: ' a, b ',
      encrypted: false,
      description: '说明',
    })
  })
})
