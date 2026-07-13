import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Prompt } from "@medusajs/ui";
import { supportChatBridge } from "@mercurjs/dashboard-shared";

import { sellerSuspensionBridge } from "../../../lib/seller-suspension-bridge";

/**
 * Single globally-mounted instance (see `Shell`). Any guarded action across
 * the panel opens it via `sellerSuspensionBridge.requestOpen()` instead of
 * owning its own dialog state.
 */
export const SellerSuspendedPromptMount = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    return sellerSuspensionBridge.subscribeOpenRequest(() => setOpen(true));
  }, []);

  return (
    <Prompt open={open} onOpenChange={setOpen} variant="confirmation">
      <Prompt.Content>
        <Prompt.Header>
          <Prompt.Title>{t("sellerSuspension.title")}</Prompt.Title>
          <Prompt.Description>
            {t("sellerSuspension.description")}
          </Prompt.Description>
        </Prompt.Header>
        <Prompt.Footer>
          <Prompt.Cancel type="button">{t("actions.cancel")}</Prompt.Cancel>
          <Prompt.Action
            type="button"
            onClick={() => supportChatBridge.requestOpen()}
          >
            {t("sellerSuspension.help")}
          </Prompt.Action>
        </Prompt.Footer>
      </Prompt.Content>
    </Prompt>
  );
};
