import { useLocation } from "react-router-dom"
import { z } from "zod"

const EmailLocationStateSchema = z.object({ email: z.string() })

/**
 * The email the auth pages hand to the next page through router state
 * (login / register → store select / onboarding); router state is untyped.
 */
export const useLocationStateEmail = (): string | undefined => {
  const { state } = useLocation()
  const parsed = EmailLocationStateSchema.safeParse(state)

  return parsed.success ? parsed.data.email : undefined
}
