import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Container, Heading, Text, Table, usePrompt, toast } from "@medusajs/ui"
import { Heart, Trash } from "@medusajs/icons"
import { ActionMenu, NoRecords } from "@mercurjs/dashboard-shared"

import { client } from "../../lib/client"

export const config = {
  label: "domain",
  translationNs: "wishlistModeration",
  icon: Heart,
  rank: 87,
}

type WishlistRow = {
  id: string
  reference: string
  created_at: string
  updated_at: string
  customer_id: string | null
  customer_name: string
  products: { id: string; title: string }[]
}

const PAGE_SIZE = 20

const WishlistModerationPage = () => {
  const { t } = useTranslation()
  const dialog = usePrompt()
  const queryClient = useQueryClient()

  const [offset, setOffset] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ["wishlist-moderation", offset],
    queryFn: () =>
      client.admin.wishlist.query({
        limit: PAGE_SIZE,
        offset,
      }),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["wishlist-moderation"] })

  const deleteWishlist = useMutation({
    mutationFn: (id: string) => client.admin.wishlist.$id.delete({ $id: id }),
    onSuccess: () => {
      toast.success(t("wishlistModeration.deleteSuccess"))
      invalidate()
    },
    onError: () => {
      toast.error(t("wishlistModeration.deleteError"))
    },
  })

  const handleDelete = async (wishlist: WishlistRow) => {
    const confirmed = await dialog({
      title: t("wishlistModeration.deletePrompt.title"),
      description: t("wishlistModeration.deletePrompt.description"),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
      variant: "danger",
    })
    if (confirmed) {
      deleteWishlist.mutate(wishlist.id)
    }
  }

  const wishlists = (data?.wishlists ?? []) as WishlistRow[]
  const count = data?.count ?? 0

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">{t("wishlistModeration.domain")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("wishlistModeration.subtitle")}
          </Text>
        </div>
      </div>

      {!isLoading && wishlists.length === 0 ? (
        <NoRecords />
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>
                {t("wishlistModeration.columns.customer")}
              </Table.HeaderCell>
              <Table.HeaderCell>
                {t("wishlistModeration.columns.products")}
              </Table.HeaderCell>
              <Table.HeaderCell>
                {t("wishlistModeration.columns.created")}
              </Table.HeaderCell>
              <Table.HeaderCell></Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {wishlists.map((wishlist) => (
              <Table.Row key={wishlist.id}>
                <Table.Cell>
                  <Text size="small" weight="plus">
                    {wishlist.customer_name}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">
                    {wishlist.products.length > 0
                      ? wishlist.products.map((product) => product.title).join(", ")
                      : t("wishlistModeration.noProducts")}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">
                    {new Date(wishlist.created_at).toLocaleDateString()}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <ActionMenu
                    groups={[
                      {
                        actions: [
                          {
                            label: t("actions.delete"),
                            icon: <Trash />,
                            onClick: () => handleDelete(wishlist),
                          },
                        ],
                      },
                    ]}
                  />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      {count > PAGE_SIZE ? (
        <Table.Pagination
          count={count}
          pageSize={PAGE_SIZE}
          pageIndex={offset / PAGE_SIZE}
          pageCount={Math.ceil(count / PAGE_SIZE)}
          canPreviousPage={offset > 0}
          canNextPage={offset + PAGE_SIZE < count}
          previousPage={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          nextPage={() => setOffset(offset + PAGE_SIZE)}
        />
      ) : null}
    </Container>
  )
}

export default WishlistModerationPage
