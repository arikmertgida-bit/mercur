import { useQuery } from "@tanstack/react-query";
import { client } from "../lib/client";

export const useMe = (
) => {
  const { data, ...rest } = useQuery({
    queryKey: ['sellers', 'me'],
    queryFn: () => client.vendor.sellers.me.query(),
  });

  return { ...data, ...rest };
};
