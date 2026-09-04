/**
 * @category Order
 * @customNamespace Order
 */
export const OrderGroupWorkflowEvents = {
    /**
     * Emitted when an order group is created.
     *
     * @eventPayload
     * ```ts
     * {
     *   id, // The ID of the order group
     * }
     * ```
     */
    CREATED: "order_group.created",
}

export const SellerWorkflowEvents = {
  CREATED: "seller.created",
  UPDATED: "seller.updated",
  DELETED: "seller.deleted",
  SUSPENDED: "seller.suspended",
  UNSUSPENDED: "seller.unsuspended",
  APPROVED: "seller.approved",
  TERMINATED: "seller.terminated",
  UNTERMINATED: "seller.unterminated",
}

export const SellerMemberWorkflowEvents = {
  CREATED: "seller_member.created",
  UPDATED: "seller_member.updated",
  DELETED: "seller_member.deleted",
}

export const MemberInviteWorkflowEvents = {
  CREATED: "member_invite.created",
  ACCEPTED: "member_invite.accepted",
}

/**
 * @category Inventory
 * @customNamespace Inventory
 */
export const InventoryWorkflowEvents = {
    /**
     * Emitted whenever a reservation or stock-level write changes the
     * available quantity of one or more inventory items — reservation
     * creation (checkout), fulfillment/return stock decrement or restock,
     * or a manual vendor/admin stock edit. Medusa's own inventory-level
     * workflows never emit a domain event, so every first-party call site
     * that touches `inventory_level` emits this one explicitly.
     *
     * @eventPayload
     * ```ts
     * {
     *   inventory_item_ids, // Distinct inventory item IDs affected
     * }
     * ```
     */
    LEVEL_CHANGED: "inventory_level.changed",
}