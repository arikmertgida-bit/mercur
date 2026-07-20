import { useParams, Link, UIMatch } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Avatar,
  Badge,
  Button,
  Container,
  Heading,
  StatusBadge,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui";
import { ExclamationCircleSolid, TriangleRightMini } from "@medusajs/icons";

import { SingleColumnPage } from "@mercurjs/dashboard-shared";
import {
  useRequest,
  useAcceptRequest,
  useRejectRequest,
} from "../../../../hooks/api/requests";
import { client } from "../../../../lib/client";

const useTypeLabels = (): Record<string, string> => {
  const { t } = useTranslation();
  return {
    product_category: t("requests.typeLabels.product_category"),
    product_collection: t("requests.typeLabels.product_collection"),
    product_tag: t("requests.typeLabels.product_tag"),
    product_type: t("requests.typeLabels.product_type"),
  };
};

const useEntityFields = (): Record<string, { key: string; label: string }[]> => {
  const { t } = useTranslation();
  return {
    product_category: [
      { key: "name", label: t("requests.fields.name") },
      { key: "handle", label: t("requests.fields.handle") },
      { key: "description", label: t("requests.fields.description") },
      { key: "is_active", label: t("requests.fields.active") },
      { key: "is_internal", label: t("requests.fields.internal") },
    ],
    product_collection: [
      { key: "title", label: t("requests.fields.title") },
      { key: "handle", label: t("requests.fields.handle") },
    ],
    product_tag: [{ key: "value", label: t("requests.fields.value") }],
    product_type: [{ key: "value", label: t("requests.fields.value") }],
  };
};

const ENTITY_NAME_KEY: Record<string, string> = {
  product_category: "name",
  product_collection: "title",
  product_tag: "value",
  product_type: "value",
};

// `request`'s non-schema fields come through the backend's
// `RequestEntityResponseSchema.catchall(JsonPrimitiveSchema)` (see
// apps/api/src/types/requests.ts), so indexing it by a runtime-computed key
// is a real, bounded union — not `unknown`.
type RequestFieldValue = string | number | boolean | Date | null | undefined;

const toDisplayName = (value: RequestFieldValue, fallback: string): string =>
  typeof value === "string" && value.length > 0 ? value : fallback;

const formatFieldValue = (
  value: RequestFieldValue,
  t: (key: string) => string,
): string => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean")
    return value ? t("requests.values.yes") : t("requests.values.no");
  return String(value);
};

const DetailBreadcrumb = (props: UIMatch) => {
  const { type, id } = props.params;
  const { request } = useRequest(type ?? "", id ?? "", undefined, {
    enabled: Boolean(type && id),
  });

  if (!request || !type) return null;

  const nameKey = ENTITY_NAME_KEY[type] ?? "name";

  return <span>{toDisplayName(request[nameKey], id ?? "")}</span>;
};

export const handle = {
  breadcrumb: (match: UIMatch) => <DetailBreadcrumb {...match} />,
};

const statusColor = (status: string) => {
  switch (status) {
    case "accepted":
      return "green" as const;
    case "pending":
      return "orange" as const;
    case "rejected":
      return "red" as const;
    default:
      return "grey" as const;
  }
};

const SectionRow = ({
  title,
  value,
}: {
  title: string;
  value?: string | null;
}) => (
  <div className="text-ui-fg-subtle grid grid-cols-2 items-center gap-4 px-6 py-4">
    <Text size="small" weight="plus" leading="compact">
      {title}
    </Text>
    <Text
      size="small"
      leading="compact"
      className="whitespace-pre-line text-pretty"
    >
      {value ?? "-"}
    </Text>
  </div>
);

const useSeller = (id: string | null | undefined) => {
  const { data, ...rest } = useQuery({
    queryKey: ["seller", id],
    queryFn: () => client.admin.sellers.$id.query({ $id: id ?? "" }),
    enabled: Boolean(id),
    retry: false,
  });

  return { seller: data?.seller, ...rest };
};

const useUser = (id: string | null | undefined) => {
  const { data, ...rest } = useQuery({
    queryKey: ["user", id],
    queryFn: () => client.admin.users.$id.query({ $id: id ?? "" }),
    enabled: Boolean(id),
  });

  return { user: data?.user, ...rest };
};

const RequestDetailPage = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const { t } = useTranslation();
  const prompt = usePrompt();
  const entityFieldsByType = useEntityFields();
  const typeLabels = useTypeLabels();

  const { request, isLoading, isError, error } = useRequest(
    type ?? "",
    id ?? "",
    undefined,
    { enabled: Boolean(type && id) },
  );

  const { mutateAsync: acceptRequest, isPending: isAccepting } =
    useAcceptRequest(type ?? "", id ?? "");

  const { mutateAsync: rejectRequest, isPending: isRejecting } =
    useRejectRequest(type ?? "", id ?? "");

  const customFields = request?.custom_fields;

  const { seller } = useSeller(customFields?.submitter_id);
  const { user } = useUser(customFields?.reviewer_id);

  if (!type || !id || isLoading || !request || !customFields) {
    return (
      <SingleColumnPage>
        <Container className="animate-pulse p-6">
          <div className="h-6 w-48 rounded bg-gray-200" />
        </Container>
      </SingleColumnPage>
    );
  }

  if (isError) throw error;

  const status = customFields.request_status;
  const isPending = status === "pending";
  const entityFields = entityFieldsByType[type] ?? [];
  const typeLabel = typeLabels[type] ?? type;
  const nameKey = ENTITY_NAME_KEY[type] ?? "name";
  const entityName = toDisplayName(request[nameKey], request.id);

  const handleAccept = async () => {
    const res = await prompt({
      title: t("requests.detail.acceptPromptTitle"),
      description: t("requests.detail.acceptPromptDescription"),
      verificationText: entityName,
      confirmText: t("actions.confirm"),
      cancelText: t("actions.cancel"),
    });

    if (!res) return;

    await acceptRequest(
      {},
      {
        onSuccess: () => toast.success(t("requests.detail.acceptSuccess")),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleReject = async () => {
    const res = await prompt({
      title: t("requests.detail.rejectPromptTitle"),
      description: t("requests.detail.rejectPromptDescription"),
      verificationText: entityName,
      confirmText: t("actions.confirm"),
      cancelText: t("actions.cancel"),
    });

    if (!res) return;

    await rejectRequest(
      {},
      {
        onSuccess: () => toast.success(t("requests.detail.rejectSuccess")),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <SingleColumnPage hasOutlet={false}>
      {isPending && (
        <div
          style={{
            background:
              "repeating-linear-gradient(-45deg, rgb(212, 212, 216, 0.15), rgb(212, 212, 216,.15) 10px, transparent 10px, transparent 20px)",
          }}
          className="-m-4 mb-1 border-b border-l p-4"
        >
          <Container className="flex items-center justify-between p-0">
            <div className="flex w-full flex-col divide-y divide-dashed">
              <div className="flex items-center gap-2 px-6 py-4">
                <ExclamationCircleSolid className="text-orange-500" />
                <Heading level="h2">{t("requests.detail.pendingReview")}</Heading>
              </div>
              <div className="bg-ui-bg-subtle flex items-center justify-end gap-x-2 rounded-b-xl px-4 py-4">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={handleReject}
                  disabled={isAccepting || isRejecting}
                >
                  {t("requests.detail.reject")}
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  onClick={handleAccept}
                  disabled={isAccepting || isRejecting}
                >
                  {t("requests.detail.accept")}
                </Button>
              </div>
            </div>
          </Container>
        </div>
      )}

      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading>{entityName}</Heading>
          <div className="flex items-center gap-x-4">
            <StatusBadge color={statusColor(status)}>
              {t(`requests.status.${status}`)}
            </StatusBadge>
            <Badge size="2xsmall" color="grey">
              {typeLabel}
            </Badge>
          </div>
        </div>
        {entityFields.map(({ key, label }) => {
          const value = request[key];
          if (value === undefined) return null;
          return (
            <SectionRow key={key} title={label} value={formatFieldValue(value, t)} />
          );
        })}
      </Container>

      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">{t("requests.detail.submitter")}</Heading>
        </div>
        <div className="px-6 py-4">
          {seller ? (
            <Link
              to={`/sellers/${seller.id}`}
              className="outline-none focus-within:shadow-borders-interactive-with-focus rounded-md [&:hover>div]:bg-ui-bg-component-hover"
            >
              <div className="shadow-elevation-card-rest bg-ui-bg-component rounded-md px-4 py-3 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={seller.logo ?? undefined}
                    fallback={seller.name?.charAt(0).toUpperCase() ?? "S"}
                  />
                  <div className="flex flex-1 flex-col">
                    <span className="text-ui-fg-base txt-small font-medium">
                      {seller.name}
                    </span>
                  </div>
                  <div className="size-7 flex items-center justify-center">
                    <TriangleRightMini className="text-ui-fg-muted" />
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <Text size="small" className="text-ui-fg-muted">
              {customFields.submitter_id ?? "-"}
            </Text>
          )}
        </div>
      </Container>

      {customFields.reviewer_id && (
        <Container className="divide-y p-0">
          <div className="px-6 py-4">
            <Heading level="h2">{t("requests.detail.reviewer")}</Heading>
          </div>
          <div className="px-6 py-4">
            {user ? (
              <div className="shadow-elevation-card-rest bg-ui-bg-component rounded-md px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    fallback={(user.first_name ?? user.email ?? "U")
                      .charAt(0)
                      .toUpperCase()}
                  />
                  <div className="flex flex-1 flex-col">
                    <span className="text-ui-fg-base txt-small font-medium">
                      {[user.first_name, user.last_name]
                        .filter(Boolean)
                        .join(" ") || user.email}
                    </span>
                    {user.first_name && user.email && (
                      <span className="text-ui-fg-muted text-xs">
                        {user.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <Text size="small" className="text-ui-fg-muted">
                {customFields.reviewer_id}
              </Text>
            )}
          </div>
        </Container>
      )}
    </SingleColumnPage>
  );
};

export default RequestDetailPage;
