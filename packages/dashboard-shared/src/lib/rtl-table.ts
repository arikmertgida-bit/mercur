/**
 * Medusa's `Table` uses physical sides: every row pads its last cell with
 * `pr-6`, cells carry `pl-0`, and header cells are `text-left`. In a
 * right-to-left language the last column (usually the "…" actions) then
 * touches the table edge and header labels sit on the opposite side of their
 * column's content. Put this on the `Table` (or a container around it, e.g.
 * the `DataTable` root) so every panel table mirrors correctly.
 *
 * Cells that set logical padding themselves (`!ps-0 !pe-0` link cells) keep it,
 * and headers given another alignment (`text-center`, `text-start`) are left
 * alone because only the default `text-left` is matched.
 */
export const RTL_TABLE_CLASSNAME: string = [
  "rtl:[&_td:last-child]:pl-6",
  "rtl:[&_th:last-child]:pl-6",
  "rtl:[&_th.text-left]:text-right",
].join(" ")
