import { CSSProperties } from "react"

type TagWidthStyle = CSSProperties & Record<"--tag-width", string>

/** Exposes the selected-count tag's width to the input's padding via CSS. */
export const tagWidthStyle = (tagWidth: number): TagWidthStyle => ({
  "--tag-width": `${tagWidth}px`,
})
