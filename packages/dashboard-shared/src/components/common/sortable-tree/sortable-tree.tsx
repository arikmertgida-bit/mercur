import {
  Announcements,
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  DropAnimation,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  UniqueIdentifier,
  closestCenter,
  defaultDropAnimation,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { sortableTreeKeyboardCoordinates } from "./keyboard-coordinates"
import { SortableTreeItem } from "./sortable-tree-item"
import type {
  FlattenedItem,
  SensorContext,
  TreeChildrenAccessor,
  TreeItem,
} from "./types"
import {
  buildTree,
  flattenTree,
  getChildCount,
  getProjection,
  removeChildrenOf,
} from "./utils"

const measuring = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
}

const dropAnimationConfig: DropAnimation = {
  keyframes({ transform }) {
    return [
      { opacity: 1, transform: CSS.Transform.toString(transform.initial) },
      {
        opacity: 0,
        transform: CSS.Transform.toString({
          ...transform.final,
          x: transform.final.x + 5,
          y: transform.final.y + 5,
        }),
      },
    ]
  },
  easing: "ease-out",
  sideEffects({ active }) {
    active.node.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: defaultDropAnimation.duration,
      easing: defaultDropAnimation.easing,
    })
  },
}

/**
 * `getChildren`/`setChildren` should be stable references (module-level
 * functions or memoized callbacks) so the flattened tree is not rebuilt on
 * every render.
 */
interface Props<T extends TreeItem> extends TreeChildrenAccessor<T> {
  collapsible?: boolean
  items: T[]
  indentationWidth?: number
  /**
   * Enable drag for all items or provide a function to enable drag for specific items.
   * @default true
   */
  enableDrag?: boolean | ((item: T) => boolean)
  onChange: (
    updatedItem: {
      id: UniqueIdentifier
      parentId: UniqueIdentifier | null
      index: number
    },
    items: T[]
  ) => void
  renderValue: (item: T) => ReactNode
}

export function SortableTree<T extends TreeItem>({
  collapsible = true,
  getChildren,
  setChildren,
  enableDrag = true,
  items = [],
  indentationWidth = 40,
  onChange,
  renderValue,
}: Props<T>) {
  const accessor: TreeChildrenAccessor<T> = useMemo(
    () => ({ getChildren, setChildren }),
    [getChildren, setChildren]
  )

  const [collapsedState, setCollapsedState] = useState<
    Record<UniqueIdentifier, boolean>
  >({})

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null)
  const [offsetLeft, setOffsetLeft] = useState(0)
  const [currentPosition, setCurrentPosition] = useState<{
    parentId: UniqueIdentifier | null
    overId: UniqueIdentifier
  } | null>(null)

  const flattenedItems = useMemo(() => {
    const flattenedTree = flattenTree(items, accessor)
    const collapsedItems = flattenedTree.reduce<UniqueIdentifier[]>(
      (acc, { id, childCount }) => {
        const collapsed = collapsedState[id]

        return collapsed && childCount ? [...acc, id] : acc
      },
      []
    )

    return removeChildrenOf(
      flattenedTree,
      activeId ? [activeId, ...collapsedItems] : collapsedItems
    )
  }, [activeId, items, accessor, collapsedState])

  const projected =
    activeId && overId
      ? getProjection(
          flattenedItems,
          activeId,
          overId,
          offsetLeft,
          indentationWidth
        )
      : null

  const sensorContext: SensorContext = useRef({
    items: flattenedItems,
    offset: offsetLeft,
  })

  const [coordinateGetter] = useState(() =>
    sortableTreeKeyboardCoordinates(sensorContext, indentationWidth)
  )

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter,
    })
  )

  const sortedIds = useMemo(
    () => flattenedItems.map(({ id }) => id),
    [flattenedItems]
  )

  const activeItem = activeId
    ? flattenedItems.find(({ id }) => id === activeId)
    : null

  useEffect(() => {
    sensorContext.current = {
      items: flattenedItems,
      offset: offsetLeft,
    }
  }, [flattenedItems, offsetLeft])

  function handleDragStart({ active: { id: activeId } }: DragStartEvent) {
    setActiveId(activeId)
    setOverId(activeId)

    const activeItem = flattenedItems.find(({ id }) => id === activeId)

    if (activeItem) {
      setCurrentPosition({
        parentId: activeItem.parentId,
        overId: activeId,
      })
    }

    document.body.style.setProperty("cursor", "grabbing")
  }

  function handleDragMove({ delta }: DragMoveEvent) {
    setOffsetLeft(delta.x)
  }

  function handleDragOver({ over }: DragOverEvent) {
    setOverId(over?.id ?? null)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    resetState()

    if (projected && over) {
      const { depth, parentId } = projected
      const clonedItems = flattenTree(items, accessor)
      const overIndex = clonedItems.findIndex(({ id }) => id === over.id)

      const activeIndex = clonedItems.findIndex(({ id }) => id === active.id)
      const activeTreeItem = clonedItems[activeIndex]

      clonedItems[activeIndex] = { ...activeTreeItem, depth, parentId }

      const sortedItems = arrayMove(clonedItems, activeIndex, overIndex)

      const { items: newItems, update } = buildTree(
        sortedItems,
        overIndex,
        accessor
      )

      onChange(update, newItems)
    }
  }

  function handleDragCancel() {
    resetState()
  }

  function resetState() {
    setOverId(null)
    setActiveId(null)
    setOffsetLeft(0)
    setCurrentPosition(null)

    document.body.style.setProperty("cursor", "")
  }

  function handleCollapse(id: UniqueIdentifier) {
    setCollapsedState((state) => ({
      ...state,
      [id]: !(state[id]),
    }))
  }

  function getMovementAnnouncement(
    eventName: string,
    activeId: UniqueIdentifier,
    overId?: UniqueIdentifier
  ) {
    if (overId && projected) {
      if (eventName !== "onDragEnd") {
        if (
          currentPosition &&
          projected.parentId === currentPosition.parentId &&
          overId === currentPosition.overId
        ) {
          return
        } else {
          setCurrentPosition({
            parentId: projected.parentId,
            overId,
          })
        }
      }

      const clonedItems = flattenTree(items, accessor)
      const overIndex = clonedItems.findIndex(({ id }) => id === overId)
      const activeIndex = clonedItems.findIndex(({ id }) => id === activeId)
      const sortedItems = arrayMove(clonedItems, activeIndex, overIndex)

      const previousItem = sortedItems[overIndex - 1]

      let announcement
      const movedVerb = eventName === "onDragEnd" ? "dropped" : "moved"
      const nestedVerb = eventName === "onDragEnd" ? "dropped" : "nested"

      if (!previousItem) {
        const nextItem = sortedItems[overIndex + 1]
        announcement = `${activeId} was ${movedVerb} before ${nextItem.id}.`
      } else {
        if (projected.depth > previousItem.depth) {
          announcement = `${activeId} was ${nestedVerb} under ${previousItem.id}.`
        } else {
          let previousSibling: FlattenedItem<T> | undefined = previousItem
          while (previousSibling && projected.depth < previousSibling.depth) {
            const parentId: UniqueIdentifier | null = previousSibling.parentId
            previousSibling = sortedItems.find(({ id }) => id === parentId)
          }

          if (previousSibling) {
            announcement = `${activeId} was ${movedVerb} after ${previousSibling.id}.`
          }
        }
      }

      return announcement
    }

    return
  }

  const announcements: Announcements = {
    onDragStart({ active }) {
      return `Picked up ${active.id}.`
    },
    onDragMove({ active, over }) {
      return getMovementAnnouncement("onDragMove", active.id, over?.id)
    },
    onDragOver({ active, over }) {
      return getMovementAnnouncement("onDragOver", active.id, over?.id)
    },
    onDragEnd({ active, over }) {
      return getMovementAnnouncement("onDragEnd", active.id, over?.id)
    },
    onDragCancel({ active }) {
      return `Moving was cancelled. ${active.id} was dropped in its original position.`
    },
  }

  return (
    <DndContext
      accessibility={{ announcements }}
      sensors={sensors}
      collisionDetection={closestCenter}
      measuring={measuring}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
        {flattenedItems.map(({ id, depth, childCount, item }) => {
          const disabled =
            typeof enableDrag === "function"
              ? !enableDrag(item)
              : !enableDrag

          return (
            <SortableTreeItem
              key={id}
              id={id}
              value={renderValue(item)}
              disabled={disabled}
              depth={id === activeId && projected ? projected.depth : depth}
              indentationWidth={indentationWidth}
              collapsed={Boolean(collapsedState[id] && childCount)}
              childCount={childCount}
              onCollapse={
                collapsible && childCount
                  ? () => handleCollapse(id)
                  : undefined
              }
            />
          )
        })}
        {createPortal(
          <DragOverlay dropAnimation={dropAnimationConfig}>
            {activeId && activeItem ? (
              <SortableTreeItem
                id={activeId}
                depth={activeItem.depth}
                clone
                childCount={getChildCount(items, activeId, accessor) + 1}
                value={renderValue(activeItem.item)}
                indentationWidth={0}
              />
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </SortableContext>
    </DndContext>
  )
}
