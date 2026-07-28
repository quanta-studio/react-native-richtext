import { useEffect, useState } from 'react'
import { Image } from 'react-native'
import { splitStyle } from '../style/split-style'
import { imageStyle, type IntrinsicSize } from './image-style'
import type { RendererProps } from '../types'
import type { BlockNode } from '@quanta-studio/react-native-richtext-core'

// Only a positive, finite number counts as an explicit dimension. Empty/whitespace
// attributes (common in CMS HTML) and 0/negative values fall through to intrinsic
// sizing rather than collapsing the image to 0x0. Note: Number('') === 0.
function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : undefined
  if (typeof value === 'string') {
    if (value.trim() === '') return undefined
    const n = Number(value)
    return Number.isFinite(n) && n > 0 ? n : undefined
  }
  return undefined
}

export function Img({ node }: RendererProps) {
  const el = node as BlockNode
  const src = el.attribs.src
  const alt = el.attribs.alt
  const { view } = splitStyle(el.style)

  const explicitWidth = toNumber(view.width) ?? toNumber(el.attribs.width)
  const explicitHeight = toNumber(view.height) ?? toNumber(el.attribs.height)
  const boxStyle = { ...view }
  delete boxStyle.width
  delete boxStyle.height

  const hasExplicit = explicitWidth !== undefined && explicitHeight !== undefined
  const [intrinsic, setIntrinsic] = useState<IntrinsicSize | undefined>(undefined)

  useEffect(() => {
    if (src === undefined || hasExplicit) return
    let active = true
    Image.getSize(
      src,
      (width, height) => {
        if (active) setIntrinsic({ width, height })
      },
      () => {},
    )
    return () => {
      active = false
    }
  }, [src, hasExplicit])

  if (src === undefined) return null
  const style = imageStyle({ explicitWidth, explicitHeight, intrinsic, viewStyle: boxStyle })
  if (style === null) return null

  return (
    <Image
      source={{ uri: src }}
      style={style}
      resizeMode="cover"
      accessibilityRole="image"
      accessibilityLabel={alt}
      accessible={alt !== undefined}
    />
  )
}
