import { ReactNode, Children } from "react"
import { useLoaderData } from "react-router-dom"

import { WidgetZone, useRequiredParam } from "@mercurjs/dashboard-shared"
import { SingleColumnPageSkeleton } from "../../../components/common/skeleton"
import { SingleColumnPage } from "../../../components/layout/pages"
import { useUser } from "../../../hooks/api/users"
import { UserGeneralSection } from "./components/user-general-section"
import { userLoader } from "./loader"

const Root = ({ children }: { children?: ReactNode }) => {
  const initialData = useLoaderData<typeof userLoader>()

  const id = useRequiredParam("id")
  const {
    user,
    isPending: isLoading,
    isError,
    error,
  } = useUser(id, undefined, {
    initialData,
  })

  if (isLoading || !user) {
    return <SingleColumnPageSkeleton sections={1} showJSON showMetadata />
  }

  if (isError) {
    throw error
  }

  return Children.count(children) > 0 ? (
    <SingleColumnPage data={user} showJSON showMetadata>
      {children}
    </SingleColumnPage>
  ) : (
    <SingleColumnPage data={user} showJSON showMetadata>
      <WidgetZone id="users.detail.main" data={user}>
        <UserGeneralSection user={user} />
      </WidgetZone>
    </SingleColumnPage>
  )
}

export const UserDetailPage = Object.assign(Root, {
  GeneralSection: UserGeneralSection,
})
