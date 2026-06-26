import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

import Button from "@/components/Button";
import Form from "@/components/forms/Form";
import FormActions from "@/components/forms/FormActions";
import FormFields from "@/components/forms/FormFields";
import Input from "@/components/forms/Input";
import { ROUTES } from "@/constants/routes";
import { usePageTitle } from "@/hooks/usePageTitle";
import { post } from "@/services/api";
import { validatePassword } from "@/utils/password";

/**
 * Component: ResetPassword
 * Allows the user to set a new password using a reset token from the URL.
 * @component
 * @returns {JSX.Element}
 */
const ResetPassword = () => {
  // Hooks
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  usePageTitle(t("features.resetPassword.pageTitle"));

  // State
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Derived State
  const token = useMemo(() => searchParams.get("token"), [searchParams]);
  const passwordRules = useMemo(() => validatePassword(t), [t]);

  // Handlers
  const onSubmit = useCallback(
    async ({ password }) => {
      setServerError("");
      setSubmitting(true);

      try {
        await post("/api/auth/reset-password", { token, password });
        setSuccess(true);
      } catch (error) {
        if (error.code === "PASSWORD_RESET_INVALID_TOKEN") {
          setServerError(t("features.resetPassword.form.error.invalidToken"));
        } else {
          setServerError(t("features.resetPassword.form.error.generic"));
        }
      } finally {
        setSubmitting(false);
      }
    },
    [token, t],
  );

  // Render
  if (!token) {
    return (
      <div className="p-auth-reset-password">
        <div className="p-auth-reset-password__header">
          <h1 className="p-auth-reset-password__header-title">
            {t("features.resetPassword.errorState.heading")}
          </h1>
          <div className="p-auth-reset-password__header-description">
            {t("features.resetPassword.errorState.invalidLink")}
          </div>
        </div>
        <div className="p-auth-reset-password__body">
          <div className="p-auth-reset-password__body-back">
            <Link
              className="p-auth-reset-password__body-back-link"
              to={ROUTES.FORGOT_PASSWORD}
            >
              {t("features.resetPassword.errorState.requestNewLink")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="p-auth-reset-password">
        <div className="p-auth-reset-password__header">
          <h1 className="p-auth-reset-password__header-title">
            {t("features.resetPassword.successState.heading")}
          </h1>
          <div className="p-auth-reset-password__header-description">
            {t("features.resetPassword.successState.message")}
          </div>
        </div>
        <div className="p-auth-reset-password__body">
          <div className="p-auth-reset-password__body-back">
            <Link
              className="p-auth-reset-password__body-back-link"
              to={ROUTES.LOGIN}
            >
              {t("features.resetPassword.successState.backToLogin")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-auth-reset-password">
      <div className="p-auth-reset-password__header">
        <h1 className="p-auth-reset-password__header-title">
          {t("features.resetPassword.heading")}
        </h1>
        <div className="p-auth-reset-password__header-description">
          {t("features.resetPassword.description")}
        </div>
      </div>
      <div className="p-auth-reset-password__body">
        <div className="p-auth-reset-password__body-form">
          <Form
            error={serverError}
            handleSubmit={handleSubmit}
            onSubmit={onSubmit}
          >
            <FormFields>
              <Input
                autoComplete="new-password"
                error={errors.password}
                name="password"
                placeholder={t("features.resetPassword.form.password")}
                register={register}
                required={t(
                  "features.resetPassword.form.error.passwordRequired",
                )}
                type="password"
                validate={passwordRules}
              />
            </FormFields>

            <FormActions>
              <Button display="block" isProcessing={submitting} type="submit">
                {t("features.resetPassword.form.submit")}
              </Button>
            </FormActions>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
