import { z } from "zod"

export const View = {
  TEMPLATE: "template",
  PROMOTION: "promotion",
  CAMPAIGN: "campaign",
} as const

export type View = (typeof View)[keyof typeof View]

export const Tab = {
  TYPE: "type",
  PROMOTION: "promotion",
  CAMPAIGN: "campaign",
} as const

export type Tab = (typeof Tab)[keyof typeof Tab]

export const TabSchema = z.enum(Tab)
