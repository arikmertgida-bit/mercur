import {
  MemberAreaPermissions,
  PERMISSION_RIGHT_RANK,
  PERMISSION_RIGHTS,
  PermissionRight,
} from "@mercurjs/types/permissions";
import { SellerRole } from "@mercurjs/types/seller";

import type { MemberPermissionArea, MemberPermissionAreas } from "@hooks/api";

export const MEMBER_PERMISSION_COLUMNS: readonly PermissionRight[] = PERMISSION_RIGHTS;

const LEFT_TO_RIGHT_ISOLATE = "\u2066";
const POP_DIRECTIONAL_ISOLATE = "\u2069";

/** Keeps an e-mail address left-to-right inside a right-to-left sentence. */
export const isolateLtr = (value: string): string =>
  `${LEFT_TO_RIGHT_ISOLATE}${value}${POP_DIRECTIONAL_ISOLATE}`;

const atLeast = (
  granted: PermissionRight | undefined,
  required: PermissionRight,
): boolean =>
  !!granted && PERMISSION_RIGHT_RANK[granted] >= PERMISSION_RIGHT_RANK[required];

const rightBelow = (right: PermissionRight): PermissionRight | undefined =>
  PERMISSION_RIGHTS[PERMISSION_RIGHTS.indexOf(right) - 1];

export const isAdministrationRole = (roleId: string): boolean =>
  roleId === SellerRole.SELLER_ADMINISTRATION;

export const allRights = (areas: MemberPermissionArea[]): MemberAreaPermissions =>
  Object.fromEntries(areas.map((area) => [area.id, area.max_right]));

/** Raises every area its checked areas depend on, until nothing changes. */
const withRequirements = (
  value: MemberAreaPermissions,
  areas: MemberPermissionArea[],
): MemberAreaPermissions => {
  const next = { ...value };
  let changed = true;
  while (changed) {
    changed = false;
    for (const area of areas) {
      const right = next[area.id];
      for (const requirement of area.requires) {
        if (atLeast(right, requirement.from) && !atLeast(next[requirement.area], requirement.right)) {
          next[requirement.area] = requirement.right;
          changed = true;
        }
      }
    }
  }
  return next;
};

/**
 * Checking a box also checks the lower ones of its row; unchecking one also
 * unchecks the higher ones. Dependencies are checked afterwards.
 */
export const toggleMemberRight = (
  value: MemberAreaPermissions,
  areas: MemberPermissionArea[],
  areaId: string,
  column: PermissionRight,
  checked: boolean,
): MemberAreaPermissions => {
  const next = { ...value };
  if (checked) {
    if (!atLeast(next[areaId], column)) {
      next[areaId] = column;
    }
  } else {
    const lower = rightBelow(column);
    if (lower) {
      next[areaId] = lower;
    } else {
      delete next[areaId];
    }
  }
  return withRequirements(next, areas);
};

export type RequiredRight = { right: PermissionRight; requiredBy: string[] };

/** For each area, the lowest right other checked areas force on it. */
export const requiredRights = (
  value: MemberAreaPermissions,
  areas: MemberPermissionArea[],
): Map<string, RequiredRight> => {
  const required = new Map<string, RequiredRight>();
  for (const area of areas) {
    for (const requirement of area.requires) {
      if (!atLeast(value[area.id], requirement.from)) {
        continue;
      }
      const current = required.get(requirement.area);
      required.set(requirement.area, {
        right:
          current && atLeast(current.right, requirement.right)
            ? current.right
            : requirement.right,
        requiredBy: [...(current?.requiredBy ?? []), area.id],
      });
    }
  }
  return required;
};

export const isRightChecked = (
  value: MemberAreaPermissions,
  areaId: string,
  column: PermissionRight,
): boolean => atLeast(value[areaId], column);

export const isRightLocked = (
  required: Map<string, RequiredRight>,
  areaId: string,
  column: PermissionRight,
): boolean => {
  const entry = required.get(areaId);
  return !!entry && atLeast(entry.right, column);
};

export const isRightAvailable = (
  area: MemberPermissionArea,
  column: PermissionRight,
): boolean => atLeast(area.max_right, column);

const sameRights = (a: MemberAreaPermissions, b: MemberAreaPermissions): boolean => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (a[key] !== b[key]) {
      return false;
    }
  }
  return true;
};

/** The boxes a role starts with; administration holds every right. */
export const templateFor = (
  roleId: string,
  data: MemberPermissionAreas,
): MemberAreaPermissions =>
  isAdministrationRole(roleId) ? allRights(data.areas) : { ...(data.templates[roleId] ?? {}) };

export const isCustomGrant = (
  roleId: string,
  value: MemberAreaPermissions,
  data: MemberPermissionAreas,
): boolean => !isAdministrationRole(roleId) && !sameRights(value, templateFor(roleId, data));

/**
 * What the invite and member routes take: nothing for administration (it
 * takes no boxes), null when the boxes match the template, else the boxes.
 */
export const permissionsPayload = (
  roleId: string,
  value: MemberAreaPermissions,
  data: MemberPermissionAreas,
): MemberAreaPermissions | null | undefined => {
  if (isAdministrationRole(roleId)) {
    return undefined;
  }
  return isCustomGrant(roleId, value, data) ? value : null;
};

/** A stored grant, or the role template when the member has none. */
export const effectiveGrant = (
  roleId: string,
  custom: MemberAreaPermissions | null | undefined,
  data: MemberPermissionAreas,
): MemberAreaPermissions =>
  !isAdministrationRole(roleId) && custom ? { ...custom } : templateFor(roleId, data);
