import { describe, expect, it } from 'vitest'
import { splitStyle } from '../src/style/split-style'

describe('splitStyle', () => {
  it('routes text props to text and box props to view', () => {
    const { view, text } = splitStyle({
      color: 'red',
      fontSize: 14,
      fontWeight: 'bold',
      marginTop: 10,
      backgroundColor: 'blue',
      width: 100,
    })
    expect(text).toEqual({ color: 'red', fontSize: 14, fontWeight: 'bold' })
    expect(view).toEqual({ marginTop: 10, backgroundColor: 'blue', width: 100 })
  })

  it('handles an empty style', () => {
    expect(splitStyle({})).toEqual({ view: {}, text: {} })
  })
})
