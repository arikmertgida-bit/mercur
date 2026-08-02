import { useEffect, useRef } from "react";

import {
  ApplicationMethodTargetTypeValues,
  HttpTypes,
  RuleTypeValues,
} from "@medusajs/types";
import { Input } from "@medusajs/ui";

import { UseFormReturn, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Form } from "../../../../../../components/common/form";
import { Combobox } from "../../../../../../components/inputs/combobox";
import { useStore } from "../../../../../../hooks/api";
import { useComboboxData } from "../../../../../../hooks/use-combobox-data";
import { sdk } from "../../../../../../lib/client";
import { CreatePromotionSchemaType } from "../../../../promotion-create/components/create-promotion-form/form-schema";

// The subset of a rule field's own schema fields this component reads;
// the field array item also carries an RHF-generated key prop, which
// isn't needed here.
type PromotionRuleField = {
  attribute: string;
};

type RuleValueFormFieldType = {
  form: UseFormReturn<CreatePromotionSchemaType>;
  identifier: string;
  scope:
    | "application_method.buy_rules"
    | "rules"
    | "application_method.target_rules";
  name: string;
  operator: string;
  fieldRule: PromotionRuleField;
  attributes: HttpTypes.AdminRuleAttributeOption[];
  ruleType: RuleTypeValues;
  applicationMethodTargetType: ApplicationMethodTargetTypeValues | undefined;
};

const buildFilters = (attribute?: string, store?: HttpTypes.AdminStore) => {
  if (!attribute || !store) {
    return {};
  }

  if (attribute === "currency_code") {
    return {
      value: store.supported_currencies?.map((c) => c.currency_code),
    };
  }

  return {};
};

export const RuleValueFormField = ({
  form,
  identifier,
  scope,
  name,
  operator,
  fieldRule,
  attributes,
  ruleType,
  applicationMethodTargetType,
}: RuleValueFormFieldType) => {
  const { t } = useTranslation();

  const attribute = attributes?.find(
    (attr) => attr.value === fieldRule.attribute,
  );

  const { store, isLoading: isStoreLoading } = useStore();

  const watchValue = useWatch({
    control: form.control,
    name: name,
  });

  // A buyget promotion is scoped to one seller (see the "Store" field on
  // the create form). When that's the case and the attribute being picked
  // is a product, narrow the picker to that seller's own products (see the
  // rule-value-options route) — for every other promotion type `seller_id`
  // stays unset and the product picker is global, same as before.
  const sellerId = useWatch({
    control: form.control,
    name: "seller_id",
  }) as string | undefined;

  const comboboxData = useComboboxData({
    queryFn: async (params) => {
      return await sdk.admin.promotions.ruleValueOptions.$ruleType.$ruleAttributeId.query({
        $ruleType: ruleType,
        $ruleAttributeId: attribute?.id,
        ...params,
        ...buildFilters(attribute?.id, store!),
        ...(attribute?.id === "product" && sellerId ? { seller_id: sellerId } : {}),
        application_method_target_type: applicationMethodTargetType,
      });
    },
    enabled:
      !!attribute?.id &&
      ["select", "multiselect"].includes(attribute.field_type) &&
      !isStoreLoading,
    getOptions: (data) => data.values,
    queryKey: ["rule-value-options", ruleType, attribute?.id, sellerId],
    defaultValue: watchValue,
    defaultValueKey: "value",
  });

  const watchOperator = useWatch({
    control: form.control,
    name: operator,
  });

  const prevOperatorRef = useRef(watchOperator);

  useEffect(() => {
    if (prevOperatorRef.current === watchOperator) {
      return;
    }

    prevOperatorRef.current = watchOperator;

    if (watchOperator === "eq") {
      form.setValue(name, "");
    } else {
      form.setValue(name, []);
    }
  }, [
	watchOperator,
	name,
	form
]);

  const fieldIndex = name.split(".").slice(-2, -1)[0];
  const testIdBase = `rule-value-form-field-${ruleType}-${fieldIndex}`;

  return (
    <Form.Field
      key={`${identifier}.${scope}.${name}-${fieldRule.attribute}`}
      name={name}
      render={({ field: { onChange, ref, ...field } }) => {
        if (attribute?.field_type === "number") {
          return (
            <Form.Item
              className="basis-1/2"
              data-testid={`${testIdBase}-number-item`}
            >
              <Form.Control data-testid={`${testIdBase}-number-control`}>
                <Input
                  {...field}
                  type="number"
                  onChange={onChange}
                  className="bg-ui-bg-base"
                  ref={ref}
                  min={1}
                  disabled={!fieldRule.attribute}
                  data-testid={`${testIdBase}-number-input`}
                />
              </Form.Control>
              <Form.ErrorMessage data-testid={`${testIdBase}-number-error`} />
            </Form.Item>
          );
        } else if (attribute?.field_type === "text") {
          return (
            <Form.Item
              className="basis-1/2"
              data-testid={`${testIdBase}-text-item`}
            >
              <Form.Control data-testid={`${testIdBase}-text-control`}>
                <Input
                  {...field}
                  ref={ref}
                  onChange={onChange}
                  className="bg-ui-bg-base"
                  disabled={!fieldRule.attribute}
                  data-testid={`${testIdBase}-text-input`}
                />
              </Form.Control>
              <Form.ErrorMessage data-testid={`${testIdBase}-text-error`} />
            </Form.Item>
          );
        } else {
          return (
            <Form.Item
              className="basis-1/2"
              data-testid={`${testIdBase}-combobox-item`}
            >
              <Form.Control data-testid={`${testIdBase}-combobox-control`}>
                <Combobox
                  {...field}
                  {...comboboxData}
                  ref={ref}
                  placeholder={
                    watchOperator === "eq"
                      ? t("labels.selectValue")
                      : t("labels.selectValues")
                  }
                  disabled={!watchOperator}
                  onChange={onChange}
                  data-testid={`${testIdBase}-combobox`}
                />
              </Form.Control>
              <Form.ErrorMessage data-testid={`${testIdBase}-combobox-error`} />
            </Form.Item>
          );
        }
      }}
    />
  );
};
