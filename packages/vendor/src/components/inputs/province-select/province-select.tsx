import {
  ComponentPropsWithoutRef,
  forwardRef,
  ForwardRefExoticComponent,
  RefAttributes,
} from "react";
import { Select } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { getCountryProvinceObjectByIso2 } from "../../../lib/data/country-states";

type ProvinceSelectProps = ComponentPropsWithoutRef<typeof Select> & {
  placeholder?: string;
  defaultValue?: string;
  country_code: string;
  valueAs?: "iso_2" | "name";
  onChange?: (value: string) => void;
};

export const ProvinceSelect: ForwardRefExoticComponent<
  ProvinceSelectProps & RefAttributes<HTMLButtonElement>
> = forwardRef<
  HTMLButtonElement,
  ProvinceSelectProps
>(
  (
    {
      disabled,
      placeholder,
      defaultValue,
      country_code,
      valueAs = "iso_2",
      onChange,
      ...field
    },
    ref
  ) => {
    const { t } = useTranslation();

    const provinceObject = getCountryProvinceObjectByIso2(country_code);

    if (!provinceObject) {
      disabled = true;
    }

    const options = Object.entries(provinceObject?.options ?? {}).map(
      ([iso2, name]) => {
        return (
          <Select.Item
            key={iso2}
            value={valueAs === "iso_2" ? iso2.toLowerCase() : name}
          >
            {name}
          </Select.Item>
        );
      }
    );

    const placeholderText = provinceObject
      ? t(`taxRegions.fields.sublevels.placeholders.${provinceObject.type}`)
      : "";

    return (
      <div className="relative">
        <Select
          {...field}
          value={
            field.value
              ? valueAs === "iso_2"
                ? field.value.toLowerCase()
                : field.value
              : undefined
          }
          defaultValue={
            defaultValue
              ? valueAs === "iso_2"
                ? defaultValue.toLowerCase()
                : defaultValue
              : undefined
          }
          onValueChange={onChange}
          disabled={disabled}
        >
          <Select.Trigger ref={ref} className="w-full">
            <Select.Value placeholder={placeholder || placeholderText} />
          </Select.Trigger>
          <Select.Content>{options}</Select.Content>
        </Select>
      </div>
    );
  }
);
ProvinceSelect.displayName = "ProvinceSelect";
