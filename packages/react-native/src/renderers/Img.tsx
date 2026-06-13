import { useEffect, useState } from 'react'
import { Image } from 'react-native'
import { splitStyle } from '../style/split-style'
import { imageStyle, type IntrinsicSize } from './image-style'
import type { RendererProps } from '../types'
import type { BlockNode } from '@yk-yong/rn-rich-text-core'

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isFinite(n) ? n : undefined
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
      accessibilityLabel={alt}
      accessible={alt !== undefined}
    />
  )
}
