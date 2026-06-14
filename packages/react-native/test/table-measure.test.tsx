import { describe, expect, it } from 'vitest'
import { create, act } from 'react-test-renderer'
import { View, ScrollView } from 'react-native'
import { RichText } from '../src'

const fireLayout = (n: { props: { onLayout?: (e: unknown) => void } }, width: number) =>
  act(() => n.props.onLayout?.({ nativeEvent: { layout: { width, height: 10, x: 0, y: 0 } } }))

const measureWrappers = (tree: ReturnType<typeof create>) =>
  tree.root.findAll(
    (n) =>
      typeof (n.props as { onLayout?: unknown }).onLayout === 'function' &&
      (n.props as { style?: { flexShrink?: number } }).style?.flexShrink === 0,
  )

// The table's own outer View (carries onLayout) — not RichText's root wrapper (no onLayout)
// and not a measure wrapper (flexShrink: 0).
const tableOuter = (tree: ReturnType<typeof create>) =>
  tree.root.findAll(
    (n) =>
      typeof (n.props as { onLayout?: unknown }).onLayout === 'function' &&
      (n.props as { style?: { flexShrink?: number } }).style?.flexShrink !== 0,
  )[0]!

const drive = (tree: ReturnType<typeof create>, container: number, cellWidths: number[]) => {
  fireLayout(tableOuter(tree), container)
  measureWrappers(tree).forEach((w, i) => fireLayout(w, cellWidths[i] ?? 0))
}

const widthsOf = (tree: ReturnType<typeof create>) =>
  tree.root
    .findAllByType(View)
    .map((v) => (v.props.style as { width?: number })?.width)
    .filter((w): w is number => typeof w === 'number')

describe('integration: table measurement', () => {
  const html = '<table><tr><td>Name</td><td>A much longer description cell</td></tr></table>'

  it('fills the container with content-proportional columns when it fits', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<RichText source={{ html }} />)
    })
    drive(tree, 300, [60, 240]) // total 300 == container -> exact fit
    expect(tree.root.findAllByType(ScrollView)).toHaveLength(0)
    expect(widthsOf(tree)).toEqual(expect.arrayContaining([60, 240]))
  })

  it('horizontally scrolls when columns exceed the container', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<RichText source={{ html }} />)
    })
    drive(tree, 100, [60, 240]) // total 300 > 100 -> overflow
    expect(tree.root.findAllByType(ScrollView)).toHaveLength(1)
    expect(widthsOf(tree)).toEqual(expect.arrayContaining([60, 240]))
  })

  it('honors an explicit <col width> without measuring', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(
        <RichText
          source={{
            html: '<table><colgroup><col width="50"><col width="150"></colgroup><tr><td>a</td><td>b</td></tr></table>',
          }}
        />,
      )
    })
    fireLayout(tableOuter(tree), 400) // only container needed
    expect(widthsOf(tree)).toEqual(expect.arrayContaining([50, 150]))
  })
})
