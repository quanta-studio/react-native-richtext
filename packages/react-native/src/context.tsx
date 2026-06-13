import { createContext, useContext } from 'react'
import type { FontMap, Renderer } from './types'

export interface RichTextContextValue {
  registry: Record<string, Renderer>
  fonts: FontMap | undefined
  onLinkPress: (href: string) => void
}

export const RichTextContext = createContext<RichTextContextValue | null>(null)

export function useRichTextContext(): RichTextContextValue {
  const value = useContext(RichTextContext)
  if (value === null) {
    throw new Error('useRichTextContext must be used within a <RichText> (RichTextContext.Provider)')
  }
  return value
}
