import fs from "fs"
import path from "path"

import { BASE_MEMBER_PERMISSIONS, MEMBER_PERMISSION_AREAS } from "../member-areas"

/**
 * The vendor panel's "Access denied" page names a missing permission by the
 * member-invite row it belongs to. Its key -> row map must stay the one the
 * server grants from, or the page would point the member at the wrong box.
 * The panel file is read as text: apps/api cannot compile another package.
 */
const PANEL_FILE = path.resolve(
  __dirname,
  "../../../../../../packages/vendor/src/lib/permissions/permission-labels.ts"
)

const block = (source: string, name: string): string => {
  const start = source.indexOf(`export const ${name}`)
  const end = source.indexOf("\n}", start)
  if (start < 0 || end < 0) {
    throw new Error(`${name} not found in ${PANEL_FILE}`)
  }
  return source.slice(start, end)
}

const source = fs.readFileSync(PANEL_FILE, "utf-8")

const panelAreas = Object.fromEntries(
  [
    ...block(source, "PERMISSION_KEY_AREAS").matchAll(
      /^\s*"?([a-z_.]+)"?: \{ area: "([a-z_]+)", max: "(view|edit|manage)" \},?$/gm
    ),
  ].map((match) => [match[1], { area: match[2], max: match[3] }])
)

const panelOthers = [
  ...block(source, "PERMISSION_KEY_OTHER_LABELS").matchAll(/^\s*"?([a-z_.]+)"?: "[a-zA-Z]+",?$/gm),
].map((match) => match[1])

describe("panel permission names follow the member areas", () => {
  const serverMap = Object.fromEntries(
    MEMBER_PERMISSION_AREAS.flatMap((area) =>
      area.keys.map((key) => [key.key, { area: area.id, max: key.max ?? area.max_right }])
    )
  )

  it("maps every area key to its row and highest right", () => {
    expect(panelAreas).toEqual(serverMap)
  })

  it("names every always-on key the table does not hold", () => {
    expect(panelOthers.length).toBeGreaterThan(0)
    for (const key of Object.keys(BASE_MEMBER_PERMISSIONS)) {
      expect(key in panelAreas || panelOthers.includes(key)).toBe(true)
    }
  })
})
