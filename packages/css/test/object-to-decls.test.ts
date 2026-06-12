import { describe, expect, it } from 'vitest'
import { objectToDecls } from '../src/collect/object-to-decls'

describe('objectToDecls', () => {
  it('converts an RNStyle object to decls', () => {
    expect(objectToDecls({ color: 'red', fontSize: 14 })).toEqual([
      { prop: 'color', value: 'red', important: false },
      { prop: 'fontSize', value: 14, important: false },
    ])
  })

  it('skips undefined values', () => {
    expect(objectToDecls({ color: 'red', fontSize: undefined })).toEqual([
      { prop: 'color', value: 'red', important: false },
    ])
  })
})
