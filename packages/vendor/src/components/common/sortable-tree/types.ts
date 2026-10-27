import type { DraggableAttributes, UniqueIdentifier } from "@dnd-kit/core"
import { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities"
import type { MutableRefObject } from "react"

export interface TreeItem {
  id: UniqueIdentifier
}

/**
 * Reads and writes the nested children of a tree item. The tree never
 * assumes a property name, so any item shape (e.g. `category_children`)
 * can be rendered without index-signature access.
 */
export type TreeChildrenAccessor<T extends TreeItem> = {
  getChildren: (item: T) => readonly T[] | null | undefined
  setChildren: (item: T, children: T[]) => T
}

export interface FlattenedItem<T extends TreeItem = TreeItem> {
  id: UniqueIdentifier
  parentId: UniqueIdentifier | null
  depth: number
  index: number
  childCount: number
  item: T
}

export type SensorContext = MutableRefObject<{
  items: FlattenedItem[]
  offset: number
}>

export type HandleProps = {
  attributes?: DraggableAttributes | undefined
  listeners?: SyntheticListenerMap | undefined
}
