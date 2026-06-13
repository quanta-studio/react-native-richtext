import type { ComponentType, ReactNode } from 'react'
import { vi } from 'vitest'

type HostProps = Record<string, unknown> & { children?: ReactNode }

// Use string-typed host components so react-test-renderer creates a single
// host fiber per element (no composite wrapper). This makes findAllByType and
// findAll-by-prop predicates each return exactly one node per rendered element.
export const View = 'View' as unknown as ComponentType<HostProps>
export const Text = 'Text' as unknown as ComponentType<HostProps>
export const Pressable = 'Pressable' as unknown as ComponentType<HostProps>

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
