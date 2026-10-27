import { HttpTypes, PromotionRuleDTO } from "@medusajs/types";
import { toast } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { useRouteModal } from "../../../../../../components/modals";
import { isTruthy } from "../../../../../../lib/is-truthy";
import {
  usePromotionAddRules,
  usePromotionRemoveRules,
  usePromotionUpdateRules,
  useUpdatePromotion,
} from "../../../../../../hooks/api/promotions";
import { RuleTypeValues } from "../../edit-rules";
import { toPromotionRuleOperator, toRuleValues } from "../../rule-payload";
import { EditRulesForm } from "../edit-rules-form";
import { EditRulesType } from "../edit-rules-form/form-schema";
import { RuleToRemove } from "../rules-form-field/rules-form-field";
import { getRuleValue } from "./utils";

type EditPromotionFormProps = {
  promotion: HttpTypes.AdminPromotion;
  rules: PromotionRuleDTO[];
  ruleType: RuleTypeValues;
};

export const EditRulesWrapper = ({
  promotion,
  rules,
  ruleType,
}: EditPromotionFormProps) => {
  const { t } = useTranslation();
  const { handleSuccess } = useRouteModal();
  const { mutateAsync: updatePromotion } = useUpdatePromotion(promotion.id);
  const { mutateAsync: addPromotionRules } = usePromotionAddRules(
    promotion.id,
    ruleType,
  );

  const { mutateAsync: removePromotionRules } = usePromotionRemoveRules(
    promotion.id,
    ruleType,
  );

  const { mutateAsync: updatePromotionRules, isPending } =
    usePromotionUpdateRules(promotion.id, ruleType);

  const handleSubmit = (rulesToRemove?: RuleToRemove[]) => {
    return async function (data: EditRulesType) {
      const applicationMethodData: Record<
        string,
        string | number | string[] | null
      > = {};
      const { rules: allRules = [] } = data;
      const disguisedRules = allRules.filter((rule) => rule.disguised);
      const disguisedRulesToRemove =
        rulesToRemove?.filter((r) => r.disguised) || [];

      // For all the rules that were disguised, convert them to actual values in the
      // database, they are currently all under application_method. If more of these are coming
      // up, abstract this away.
      for (const rule of disguisedRules) {
        applicationMethodData[rule.attribute] = getRuleValue(rule);
      }

      for (const rule of disguisedRulesToRemove) {
        applicationMethodData[rule.attribute] = null;
      }

      // This variable will contain the rules that are actual rule objects, without the disguised
      // objects
      const rulesData = allRules.filter((rule) => !rule.disguised);
      const rulesToCreate = rulesData.filter((rule) => !("id" in rule));
      const rulesToUpdate = rulesData.flatMap((rule) =>
        typeof rule.id === "string" ? [{ ...rule, id: rule.id }] : [],
      );

      try {
        if (Object.keys(applicationMethodData).length) {
          await updatePromotion({
            application_method: applicationMethodData,
          });
        }

        if (rulesToCreate.length) {
          await addPromotionRules({
            create: rulesToCreate.flatMap((rule) => {
              const operator = toPromotionRuleOperator(rule.operator);

              return operator
                ? [
                    {
                      attribute: rule.attribute,
                      operator,
                      values: toRuleValues(rule.values),
                    },
                  ]
                : [];
            }),
          });
        }

        if (rulesToRemove?.length) {
          await removePromotionRules({
            delete: rulesToRemove.map((r) => r.id).filter(isTruthy),
          });
        }

        if (rulesToUpdate.length) {
          await updatePromotionRules({
            update: rulesToUpdate.map((rule) => ({
              id: rule.id,
              attribute: rule.attribute,
              operator: toPromotionRuleOperator(rule.operator),
              values: toRuleValues(rule.values),
            })),
          });
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
        return;
      }

      toast.success(t("promotions.toasts.promotionUpdateSuccess"));
      handleSuccess();
    };
  };

  return (
    <EditRulesForm
      promotion={promotion}
      rules={rules}
      ruleType={ruleType}
      handleSubmit={handleSubmit}
      isSubmitting={isPending}
    />
  );
};
