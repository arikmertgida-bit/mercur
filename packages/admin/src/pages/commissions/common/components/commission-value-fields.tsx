import { CurrencyInput, Label } from "@medusajs/ui";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Form } from "../../../../components/common/form";
import { DeprecatedPercentageInput } from "../../../../components/inputs/percentage-input";
import { getCurrencySymbol } from "../../../../lib/data/currencies";

/**
 * The value fields every commission form (wizard, global drawer, rule
 * drawer) shares; the component reads them from the host's form provider.
 */
export type CommissionValueFormValues = {
  value?: number | null;
  fixed_values?: Record<string, number | undefined>;
};

type CommissionValueFieldsProps = {
  type: "percentage" | "fixed";
  currencies: string[];
};

/**
 * Renders the commission Value field:
 *  - Percentage → a single `%` input bound to `value`.
 *  - Fixed → one `CurrencyInput` per store currency, bound to
 *    `fixed_values.<currency_code>`.
 */
export const CommissionValueFields = ({
  type,
  currencies,
}: CommissionValueFieldsProps) => {
  const { t } = useTranslation();
  const { control } = useFormContext<CommissionValueFormValues>();

  if (type === "percentage") {
    return (
      <Form.Field
        control={control}
        name="value"
        render={({ field: { value, onChange, ...field } }) => (
          <Form.Item>
            <Form.Label>{t("commissions.fields.value")}</Form.Label>
            <Form.Control>
              <DeprecatedPercentageInput
                min={0}
                max={100}
                {...field}
                value={value ?? ""}
                onChange={(e) =>
                  onChange(
                    e.target.value === "" ? null : parseFloat(e.target.value)
                  )
                }
              />
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />
    );
  }

  return (
    <div className="flex flex-col gap-y-2">
      <Label size="small" weight="plus">
        {t("commissions.fields.value")}
      </Label>
      <div className="flex flex-col gap-y-2">
        {currencies.map((code) => (
          <Form.Field
            key={code}
            control={control}
            name={`fixed_values.${code}`}
            render={({ field: { value, onChange, ...field } }) => (
              <Form.Item>
                <Form.Control>
                  <CurrencyInput
                    min={0}
                    code={code}
                    symbol={getCurrencySymbol(code)}
                    onValueChange={(val) =>
                    onChange(val ? parseFloat(val) : undefined)
                  }
                    {...field}
                    value={value ?? ""}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
        ))}
      </div>
    </div>
  );
};
