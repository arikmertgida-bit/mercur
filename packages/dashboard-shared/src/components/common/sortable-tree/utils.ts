import type { UniqueIdentifier } from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"

import type { FlattenedItem, TreeChildrenAccessor, TreeItem } from "./types"

export const iOS = /iPad|iPhone|iPod/.test(navigator.platform)

function getDragDepth(offset: number, indentationWidth: number) {
  return Math.round(offset / indentationWidth)
}

export function getProjection(
  items: FlattenedItem[],
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier,
  dragOffset: number,
  indentationWidth: number
) {
  const overItemIndex = items.findIndex(({ id }) => id === overId)
  const activeItemIndex = items.findIndex(({ id }) => id === activeId)
  const activeItem = items[activeItemIndex]
  const newItems = arrayMove(items, activeItemIndex, overItemIndex)
  const previousItem = newItems[overItemIndex - 1]
  const nextItem = newItems[overItemIndex + 1]
  const dragDepth = getDragDepth(dragOffset, indentationWidth)
  const projectedDepth = activeItem.depth + dragDepth
  const maxDepth = getMaxDepth({
    previousItem,
  })
  const minDepth = getMinDepth({ nextItem })
  let depth = projectedDepth

  if (projectedDepth >= maxDepth) {
    depth = maxDepth
  } else if (projectedDepth < minDepth) {
    depth = minDepth
  }

  return { depth, maxDepth, minDepth, parentId: getParentId() }

  function getParentId() {
    if (depth === 0 || !previousItem) {
      return null
    }

    if (depth === previousItem.depth) {
      return previousItem.parentId
    }

    if (depth > previousItem.depth) {
      return previousItem.id
    }

    const newParent = newItems
      .slice(0, overItemIndex)
      .reverse()
      .find((item) => item.depth === depth)?.parentId

    return newParent ?? null
  }
}

function getMaxDepth({ previousItem }: { previousItem: FlattenedItem }) {
  if (previousItem) {
    return previousItem.depth + 1
  }

  return 0
}

function getMinDepth({ nextItem }: { nextItem: FlattenedItem }) {
  if (nextItem) {
    return nextItem.depth
  }

  return 0
}

function getChildrenOf<T extends TreeItem>(
  item: T,
  accessor: TreeChildrenAccessor<T>
): readonly T[] {
  return accessor.getChildren(item) ?? []
}

function flatten<T extends TreeItem>(
  items: readonly T[],
  parentId: UniqueIdentifier | null,
  depth: number,
  accessor: TreeChildrenAccessor<T>
): FlattenedItem<T>[] {
  return items.flatMap((item, index) => {
    const children = getChildrenOf(item, accessor)

    return [
      {
        id: item.id,
        parentId,
        depth,
        index,
        childCount: children.length,
        item,
      },
      ...flatten(children, item.id, depth + 1, accessor),
    ]
  })
}

export function flattenTree<T extends TreeItem>(
  items: readonly T[],
  accessor: TreeChildrenAccessor<T>
): FlattenedItem<T>[] {
  return flatten(items, null, 0, accessor)
}

type ItemUpdate = {
  id: UniqueIdentifier
  parentId: UniqueIdentifier | null
  index: number
}

/**
 * Rebuilds the nested tree from a (re-ordered) flat list. Children keep the
 * order in which they appear in `flattenedItems`.
 */
export function buildTree<T extends TreeItem>(
  flattenedItems: FlattenedItem<T>[],
  newIndex: number,
  accessor: TreeChildrenAccessor<T>
): { items: T[]; update: ItemUpdate } {
  const knownIds = new Set(flattenedItems.map(({ id }) => id))
  const childrenOf = new Map<UniqueIdentifier | null, FlattenedItem<T>[]>()
  let update: ItemUpdate | undefined

  flattenedItems.forEach((node, index) => {
    if (node.parentId !== null && !knownIds.has(node.parentId)) {
      throw new Error(`Could not find parent ${node.parentId}`)
    }

    const siblings = childrenOf.get(node.parentId) ?? []
    siblings.push(node)
    childrenOf.set(node.parentId, siblings)

    /**
     * Get the information for them item that was moved to the `newIndex`.
     */
    if (index === newIndex) {
      update = {
        id: node.id,
        parentId: node.parentId,
        index: siblings.length - 1,
      }
    }
  })

  if (!update) {
    throw new Error("Could not find item")
  }

  const build = (parentId: UniqueIdentifier | null): T[] =>
    (childrenOf.get(parentId) ?? []).map((node) =>
      accessor.setChildren(node.item, build(node.id))
    )

  return {
    items: build(null),
    update,
  }
}

export function findItem<T extends TreeItem>(
  items: readonly T[],
  itemId: UniqueIdentifier
) {
  return items.find(({ id }) => id === itemId)
}

export function findItemDeep<T extends TreeItem>(
  items: readonly T[],
  itemId: UniqueIdentifier,
  accessor: TreeChildrenAccessor<T>
): T | undefined {
  for (const item of items) {
    if (item.id === itemId) {
      return item
    }

    const child = findItemDeep(getChildrenOf(item, accessor), itemId, accessor)

    if (child) {
      return child
    }
  }

  return undefined
}

export function setProperty<TItem extends TreeItem, K extends keyof TItem>(
  items: readonly TItem[],
  id: UniqueIdentifier,
  property: K,
  accessor: TreeChildrenAccessor<TItem>,
  setter: (value: TItem[K]) => TItem[K]
): TItem[] {
  return items.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        [property]: setter(item[property]),
      }
    }

    const children = getChildrenOf(item, accessor)

    if (children.length) {
      return accessor.setChildren(
        item,
        setProperty(children, id, property, accessor, setter)
      )
    }

    return item
  })
}

function countDescendants<T extends TreeItem>(
  items: readonly T[],
  accessor: TreeChildrenAccessor<T>
): number {
  return items.reduce(
    (acc, item) =>
      acc + 1 + countDescendants(getChildrenOf(item, accessor), accessor),
    0
  )
}

export function getChildCount<T extends TreeItem>(
  items: readonly T[],
  id: UniqueIdentifier,
  accessor: TreeChildrenAccessor<T>
) {
  const item = findItemDeep(items, id, accessor)

  return item ? countDescendants(getChildrenOf(item, accessor), accessor) : 0
}

export function removeChildrenOf<T extends TreeItem>(
  items: FlattenedItem<T>[],
  ids: UniqueIdentifier[]
) {
  const excludeParentIds = [...ids]

  return items.filter((item) => {
    if (item.parentId && excludeParentIds.includes(item.parentId)) {
      if (item.childCount) {
        excludeParentIds.push(item.id)
      }
      return false
    }

    return true
  })
}

export function listItemsWithChildren<T extends TreeItem>(
  items: readonly T[],
  accessor: TreeChildrenAccessor<T>
): T[] {
  return items.map((item) =>
    accessor.setChildren(
      item,
      listItemsWithChildren(getChildrenOf(item, accessor), accessor)
    )
  )
}
