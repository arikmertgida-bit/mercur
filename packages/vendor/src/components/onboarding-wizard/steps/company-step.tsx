import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Heading, Input, RadioGroup } from "@medusajs/ui";
import i18n from "i18next";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";

import { Form } from "@components/common/form";

const COMPANY_TYPE_INDIVIDUAL = "individual";
const COMPANY_TYPE_CORPORATE = "corporate";

const TC_KIMLIK_NO_LENGTH = 11;
const VERGI_KIMLIK_NO_LENGTH = 10;

const toDigitsOnly = (value: string, maxLength: number): string =>
  value.replace(/\D/g, "").slice(0, maxLength);

const CompanyStepSchema = z
  .object({
    company_type: z
      .string()
      .min(1, i18n.t("onboarding.wizard.validation.companyTypeRequired")),
    corporate_name: z.string().min(1, i18n.t("onboarding.wizard.validation.nameRequired")),
    registration_number: z.string().optional(),
    tax_id: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.company_type === COMPANY_TYPE_INDIVIDUAL &&
      !data.registration_number?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["registration_number"],
        message: i18n.t("onboarding.wizard.validation.registrationNumberRequired"),
      });
    }
    if (data.company_type === COMPANY_TYPE_CORPORATE && !data.tax_id?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tax_id"],
        message: i18n.t("onboarding.wizard.validation.taxIdRequired"),
      });
    }
  });

type CompanyStepValues = z.infer<typeof CompanyStepSchema>;

type CompanyStepProps = {
  onSubmit: (data: CompanyStepValues) => Promise<void>;
  isPending?: boolean;
};

export const CompanyStep = ({ onSubmit, isPending }: CompanyStepProps) => {
  const { t } = useTranslation();

  const form = useForm<CompanyStepValues>({
    resolver: zodResolver(CompanyStepSchema),
    defaultValues: {
      company_type: "",
      corporate_name: "",
      registration_number: "",
      tax_id: "",
    },
  });

  const companyType = form.watch("company_type");

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit(data);
  });

  return (
    <div className="flex flex-col gap-y-8">
      <Heading level="h2" className="text-ui-fg-base text-lg">
        {t("onboarding.wizard.company.title")}
      </Heading>

      <Alert variant="info" className="bg-ui-bg-base items-start">
        {t("onboarding.wizard.company.disclaimer")}
      </Alert>

      <Form {...form}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-y-6">
          <div className="flex flex-col gap-y-4">
            <Form.Field
              control={form.control}
              name="corporate_name"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>
                    {t("onboarding.wizard.company.corporateName")}
                  </Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name="company_type"
              render={({ field: { value, onChange, ...field } }) => (
                <Form.Item>
                  <Form.Label>
                    {t("onboarding.wizard.company.typeLabel")}
                  </Form.Label>
                  <Form.Control>
                    <RadioGroup
                      {...field}
                      className="flex-col gap-y-3"
                      value={value}
                      onValueChange={onChange}
                    >
                      <RadioGroup.ChoiceBox
                        value={COMPANY_TYPE_INDIVIDUAL}
                        label={t("onboarding.wizard.company.typeIndividual")}
                        description={t(
                          "onboarding.wizard.company.typeIndividualDescription",
                        )}
                      />
                      <RadioGroup.ChoiceBox
                        value={COMPANY_TYPE_CORPORATE}
                        label={t("onboarding.wizard.company.typeCorporate")}
                        description={t(
                          "onboarding.wizard.company.typeCorporateDescription",
                        )}
                      />
                    </RadioGroup>
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            {companyType === COMPANY_TYPE_INDIVIDUAL && (
              <Form.Field
                control={form.control}
                name="registration_number"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>
                      {t("onboarding.wizard.company.registrationNumber")}
                    </Form.Label>
                    <Form.Control>
                      <Input
                        {...field}
                        inputMode="numeric"
                        maxLength={TC_KIMLIK_NO_LENGTH}
                        onChange={(e) =>
                          field.onChange(
                            toDigitsOnly(e.target.value, TC_KIMLIK_NO_LENGTH),
                          )
                        }
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
            )}
            {companyType === COMPANY_TYPE_CORPORATE && (
              <Form.Field
                control={form.control}
                name="tax_id"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>
                      {t("onboarding.wizard.company.taxId")}
                    </Form.Label>
                    <Form.Control>
                      <Input
                        {...field}
                        inputMode="numeric"
                        maxLength={VERGI_KIMLIK_NO_LENGTH}
                        onChange={(e) =>
                          field.onChange(
                            toDigitsOnly(e.target.value, VERGI_KIMLIK_NO_LENGTH),
                          )
                        }
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
            )}
          </div>
          <Button type="submit" className="w-full" isLoading={isPending}>
            {t("actions.continue")}
          </Button>
        </form>
      </Form>
    </div>
  );
};
