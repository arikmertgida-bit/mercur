import { useQueryParams } from "@mercurjs/dashboard-shared"

type UseFollowerTableQueryProps = {
  prefix?: string
  pageSize?: number
}

export const useFollowerTableQuery = ({
  prefix,
  pageSize = 20,
}: UseFollowerTableQueryProps) => {
  const queryObject = useQueryParams(["offset"], prefix)

  const { offset } = queryObject

  const searchParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
  }

  return {
    searchParams,
    raw: queryObject,
  }
}
