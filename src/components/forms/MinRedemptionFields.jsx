import { useTranslation } from "react-i18next";

import Input from "@/components/forms/Input";
import Select from "@/components/forms/Select";
import { MIN_REDEMPTION_MODES } from "@/constants/redemption";

/**
 * Component: MinRedemptionFields
 * Minimum-redemption policy fields for a react-hook-form: a mode select
 * (none/full/custom) plus a euro amount input revealed only when the mode is
 * "custom". Shared by the store settings, admin store edit, and per-vallle edit
 * screens. The amount field holds euros; callers convert to/from cents.
 * @component
 * @param {Object} props
 * @param {Function} props.register - react-hook-form register
 * @param {Object} props.control - react-hook-form control
 * @param {Function} props.watch - react-hook-form watch (used to reveal the amount)
 * @param {Object} props.errors - react-hook-form errors object
 * @param {string} props.modeName - Form field name for the mode value
 * @param {string} props.amountName - Form field name for the euro amount value
 * @returns {JSX.Element}
 */
const MinRedemptionFields = ({
  register,
  control,
  watch,
  errors,
  modeName,
  amountName,
}) => {
  // Hooks
  const { t } = useTranslation();

  // Derived State
  const isCustom = watch(modeName) === MIN_REDEMPTION_MODES.CUSTOM;

  const modeOptions = [
    {
      value: MIN_REDEMPTION_MODES.NONE,
      label: t("features.vallles.minRedemption.form.modeNone"),
    },
    {
      value: MIN_REDEMPTION_MODES.FULL,
      label: t("features.vallles.minRedemption.form.modeFull"),
    },
    {
      value: MIN_REDEMPTION_MODES.CUSTOM,
      label: t("features.vallles.minRedemption.form.modeCustom"),
    },
  ];

  // Render
  return (
    <>
      <Select
        control={control}
        error={errors[modeName]}
        hint={t("features.vallles.minRedemption.form.modeHint")}
        label={t("features.vallles.minRedemption.form.modeLabel")}
        name={modeName}
        options={modeOptions}
      />
      {isCustom && (
        <Input
          error={errors[amountName]}
          inputMode="decimal"
          label={t("features.vallles.minRedemption.form.amountLabel")}
          name={amountName}
          register={register}
          required={t(
            "features.vallles.minRedemption.form.error.amountRequired",
          )}
          validate={{
            positive: (v) =>
              Number.parseFloat(v) > 0 ||
              t("features.vallles.minRedemption.form.error.amountPositive"),
          }}
        />
      )}
    </>
  );
};

export default MinRedemptionFields;
