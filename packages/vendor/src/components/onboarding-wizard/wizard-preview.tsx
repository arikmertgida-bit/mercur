import { AnimatePresence, motion } from "motion/react";

import { assetUrl } from "../../utils/asset-url";
import { WIZARD_STEP_ILLUSTRATIONS, WizardStepId } from "./constants";

type WizardPreviewProps = {
  stepId: WizardStepId;
};

export const WizardPreview = ({ stepId }: WizardPreviewProps) => {
  const illustrationPath = WIZARD_STEP_ILLUSTRATIONS[stepId];

  return (
    <div className="bg-ui-bg-subtle relative hidden flex-1 overflow-hidden lg:flex">
      <AnimatePresence mode="wait">
        <motion.img
          key={illustrationPath}
          src={assetUrl(illustrationPath)}
          alt=""
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          className="absolute inset-0 h-full w-full object-contain"
        />
      </AnimatePresence>
    </div>
  );
};
