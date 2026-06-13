import { createElement, type ReactNode } from 'react'
import { vi } from 'vitest'

type HostProps = Record<string, unknown> & { children?: ReactNode }

const host =
  (type: string) =>
  ({ children, ...props }: HostProps) =>
    createElement(type, props, children)

export const View = host('View')
export const Text = host('Text')
export const Pressable = host('Pressable')

export const StyleSheet = {
  create: <T,>(styles: T): T => styles,
  flatten: (style: unknown): Record<string, unknown> => {
    if (Array.isArray(style)) {
      return Object.assign({}, ...style.flat(Infinity).filter(Boolean))
    }
    return (style as Record<string, unknown>) ?? {}
  },
}

export const Linking = { openURL: vi.fn(() => Promise.resolve()) }

// Minimal type stand-ins used by source imports (the real react-native types are
// used at typecheck time; this mock is only swapped in at test runtime via the alias).
export type ViewStyle = Record<string, unknown>
export type TextStyle = Record<string, unknown>
export type StyleProp<T> = T | T[] | null | undefined
