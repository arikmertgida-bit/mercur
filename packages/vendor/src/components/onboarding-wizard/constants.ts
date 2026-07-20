export const WIZARD_STEPS = [
  {
    id: "store",
    number: 1,
    labelKey: "onboarding.wizard.steps.store",
  },
  {
    id: "address",
    number: 2,
    labelKey: "onboarding.wizard.steps.address",
  },
  {
    id: "company",
    number: 3,
    labelKey: "onboarding.wizard.steps.company",
  },
  {
    id: "payment",
    number: 4,
    labelKey: "onboarding.wizard.steps.payment",
  },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

export const TOTAL_STEPS = WIZARD_STEPS.length;

export const DEFAULT_WIZARD_STEP_ID: WizardStepId = WIZARD_STEPS[0].id;

// Keyed by WizardStepId (not array index) so adding/reordering a step in
// WIZARD_STEPS can never silently desync from its preview illustration —
// missing a key here is a compile-time error, not a runtime fallback.
export const WIZARD_STEP_ILLUSTRATIONS: Record<WizardStepId, string> = {
  store: "/onboarding/wizard-store.jpeg",
  address: "/onboarding/wizard-address.png",
  company: "/onboarding/wizard-company.png",
  payment: "/onboarding/wizard-payment.png",
};
