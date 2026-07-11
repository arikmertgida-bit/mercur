import { useState } from "react";

import {
  PromotionDTO,
  PromotionRuleDTO,
  PromotionRuleResponse,
} from "@medusajs/types";
import { Button } from "@medusajs/ui";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { RouteDrawer } from "../../../../../../components/modals";
import { KeyboundForm } from "../../../../../../components/utilities/keybound-form";
import { RuleTypeValues } from "../../edit-rules";
import { RuleToRemove } from "../rules-form-field";
import { RulesFormField } from "../rules-form-field";
import { EditRules, EditRulesType } from "./form-schema";

type EditPromotionFormProps = {
  promotion: PromotionDTO;
  rules: PromotionRuleDTO[];
  ruleType: RuleTypeValues;
  handleSubmit: (
    rulesToRemove?: RuleToRemove[]
  ) => (data: { rules: PromotionRuleResponse[] }) => Promise<void>;
  isSubmitting: boolean;
};

export const EditRulesForm = ({
  promotion,
  ruleType,
  handleSubmit,
  isSubmitting,
}: EditPromotionFormProps) => {
  const { t } = useTranslation();
  const [rulesToRemove, setRulesToRemove] = useState<RuleToRemove[]>([]);

  const form = useForm<EditRulesType>({
    defaultValues: {
      rules: [],
      type: promotion.type,
      application_method: {
        target_type: promotion.application_method?.target_type,
      },
    },
    resolver: zodResolver(EditRules),
  });

  const handleFormSubmit = form.handleSubmit(handleSubmit(rulesToRemove));

  return (
    <RouteDrawer.Form
      form={form}
      data-testid={`promotion-edit-rules-form-${ruleType}`}
    >
      <KeyboundForm
        onSubmit={handleFormSubmit}
        className="flex h-full flex-col overflow-hidden"
      >
        <RouteDrawer.Body
          data-testid={`promotion-edit-rules-form-body-${ruleType}`}
          className="flex-1 overflow-y-auto"
        >
          <RulesFormField
            // `RulesFormField` is shared with the promotion-create flow and
            // types its `form` prop against `CreatePromotionSchemaType`.
            // `EditRulesType` only models the subset of fields the edit flow
            // actually uses, so the two schemas aren't structurally
            // convertible without a cast.
            // @ts-expect-error
            form={form}
            ruleType={ruleType}
            setRulesToRemove={setRulesToRemove}
            rulesToRemove={rulesToRemove}
            promotion={promotion}
            formType="edit"
          />
        </RouteDrawer.Body>

        <RouteDrawer.Footer
          data-testid={`promotion-edit-rules-form-footer-${ruleType}`}
        >
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button
                size="small"
                variant="secondary"
                disabled={isSubmitting}
                data-testid={`promotion-edit-rules-form-cancel-button-${ruleType}`}
              >
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>

            <Button
              size="small"
              type="submit"
              isLoading={isSubmitting}
              data-testid={`promotion-edit-rules-form-save-button-${ruleType}`}
            >
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  );
};
