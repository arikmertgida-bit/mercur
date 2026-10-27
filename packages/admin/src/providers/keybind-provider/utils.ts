import { Keys, Platform, Shortcut } from "./types"

const PLATFORMS: Platform[] = ["Mac", "Windows", "Linux"]

const toPlatform = (value: string): Platform | undefined =>
  PLATFORMS.find((platform) => platform === value)

export const findFirstPlatformMatch = (
  keys: Keys
): { platform: Platform; keys: string[] } | null => {
  for (const key of Object.keys(keys)) {
    const platform = toPlatform(key)
    const platformKeys = platform ? keys[platform] : undefined

    if (platform && platformKeys && platformKeys.length > 0) {
      return { platform, keys: platformKeys }
    }
  }

  return null
}

export const getShortcutKeys = (shortcut: Shortcut) => {
  const platform: Platform = "Mac"

  const keys: string[] | undefined = shortcut.keys[platform]

  if (!keys) {
    const defaultPlatform = findFirstPlatformMatch(shortcut.keys)

    return defaultPlatform ? defaultPlatform.keys : []
  }

  return keys
}

const keysMatch = (keys1: string[], keys2: string[]) => {
  return (
    keys1.length === keys2.length &&
    keys1.every(
      (key, index) => key.toLowerCase() === keys2[index].toLowerCase()
    )
  )
}

export const findShortcutIndex = (shortcuts: Shortcut[], keys: string[]) => {
  if (!keys.length) {
    return -1
  }

  let index = 0
  for (const shortcut of shortcuts) {
    const shortcutKeys = getShortcutKeys(shortcut)

    if (keysMatch(shortcutKeys, keys)) {
      return index
    }

    index++
  }

  return -1
}

export const findShortcut = (shortcuts: Shortcut[], keys: string[]) => {
  const shortcutIndex = findShortcutIndex(shortcuts, keys)
  return shortcutIndex > -1 ? shortcuts[shortcutIndex] : null
}

export const getShortcutWithDefaultValues = (
  shortcut: Shortcut,
  platform: Platform = "Mac"
): Shortcut => {
  const platforms: Platform[] = ["Mac", "Windows", "Linux"]

  const defaultKeys = Object.values(shortcut.keys)[0] ?? shortcut.keys[platform]

  const keys = platforms.reduce((acc, curr) => {
    return {
      ...acc,
      [curr]: shortcut.keys[curr] ?? defaultKeys,
    }
  }, {})

  return {
    ...shortcut,
    keys,
    _defaultKeys: shortcut.keys,
  }
}
