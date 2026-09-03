import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

/**
 * Redirect-only stub, mirroring packages/admin/src/pages/home — the real
 * dashboard lives at `./dashboard/page.tsx` so it gets a visible URL slug
 * (`/dashboard`) like every other nav item instead of living bare at "/".
 */
const AdminHomeRedirect = () => {
  const navigate = useNavigate()

  useEffect(() => {
    navigate("/dashboard", { replace: true })
  }, [navigate])

  return <div />
}

export default AdminHomeRedirect
