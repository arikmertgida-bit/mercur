import { InferClientInput } from "@mercurjs/client";
import { sdk } from "../../../lib/client";
import { useQueryParams } from "../../use-query-params";

type UseReturnTableQueryProps = {
  prefix?: string;
  pageSize?: number;
};

export const useReturnTableQuery = ({
  prefix,
  pageSize = 20,
}: UseReturnTableQueryProps) => {
  const queryObject = useQueryParams(
    ["offset", "status", "order", "created_at", "updated_at"],
    prefix
  );

  const { offset, status, order, created_at, updated_at } = queryObject;

  const searchParams: InferClientInput<typeof sdk.vendor.returns.query> = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    status: status?.split(","),
    order: order ?? "-created_at",
    created_at: created_at ? JSON.parse(created_at) : undefined,
    updated_at: updated_at ? JSON.parse(updated_at) : undefined,
    fields: "+order.display_id,+order.email,+items.id",
  };

  return {
    searchParams,
    raw: queryObject,
  };
};
