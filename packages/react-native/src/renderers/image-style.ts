export interface IntrinsicSize {
  width: number
  height: number
}

export interface ImageStyleOptions {
  explicitWidth?: number
  explicitHeight?: number
  intrinsic?: IntrinsicSize
  viewStyle: Record<string, unknown>
}

/** Compute the final RN <Image> style: explicit dims, else intrinsic ratio capped to the container, else null while loading. */
export function imageStyle(options: ImageStyleOptions): Record<string, unknown> | null {
  const { explicitWidth, explicitHeight, intrinsic, viewStyle } = options
  if (explicitWidth !== undefined && explicitHeight !== undefined) {
    return { ...viewStyle, width: explicitWidth, height: explicitHeight }
  }
  if (intrinsic !== undefined) {
    return {
      ...viewStyle,
      width: explicitWidth ?? intrinsic.width,
      maxWidth: '100%',
      aspectRatio: intrinsic.width / intrinsic.height,
    }
  }
  return null
}
