export type KeybindContextState = {
  shortcuts: Shortcut[]
  registerShortcut: (shortcut: Shortcut) => void
  getKeysByPlatform: (
    command: Shortcut
  ) => { platform: Platform; keys: string[] } | null
}

export type Platform = "Mac" | "Windows" | "Linux"

export type Keys = {
  [key in Platform]?: string[]
}

export type ShortcutType =
  | "pageShortcut"
  | "settingShortcut"
  | "commandShortcut"

export type Shortcut = {
  keys: Keys
  type: ShortcutType
  label: string
  _defaultKeys?: Keys
} & (
  | {
      callback: () => void
      to?: never
    }
  | {
      to: string
      callback?: never
    }
)
