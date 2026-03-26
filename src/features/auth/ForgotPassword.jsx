import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import Button from "@/components/Button";
import Form from "@/components/forms/Form";
import FormActions from "@/components/forms/FormActions";
import FormFields from "@/components/forms/FormFields";
import Input from "@/components/forms/Input";
import { ROUTES } from "@/constants/routes";
import { post } from "@/services/api";

/**
 * Component: ForgotPassword
 * Allows the user to request a password reset link via email.
 * @component
 * @returns {JSX.Element}
 */
const ForgotPassword = () => {
  // Hooks
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // State
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  // Handlers
  const onSubmit = useCallback(
    async ({ email }) => {
      setServerError("");
      setSubmitting(true);

      try {
        await post("/api/auth/forgot-password", { email });
        setSent(true);
      } catch {
        setServerError(t("features.forgotPassword.form.error.generic"));
      } finally {
        setSubmitting(false);
      }
    },
    [t],
  );

  // Render
  if (sent) {
    return (
      <div className="p-auth-forgot-password">
        <div className="p-auth-forgot-password__logo">
          <img
            alt=""
            className="p-auth-forgot-password__logo-image"
            src="/images/logo.svg"
          />
        </div>
        <div className="p-auth-forgot-password__header">
          <h1 className="p-auth-forgot-password__heading">
            {t("features.forgotPassword.successState.heading")}
          </h1>
          <p className="p-auth-forgot-password__description">
            {t("features.forgotPassword.successState.message")}
          </p>
        </div>
        <div className="p-auth-forgot-password__body">
          <div className="p-auth-forgot-password__body-back">
            <Link
              className="p-auth-forgot-password__body-back-link"
              to={ROUTES.LOGIN}
            >
              {t("features.forgotPassword.successState.backToLogin")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-auth-forgot-password">
      <div className="p-auth-forgot-password__logo">
        <img
          alt=""
          className="p-auth-forgot-password__logo-image"
          src="/images/logo.svg"
        />
      </div>
      <div className="p-auth-forgot-password__header">
        <h1 className="p-auth-forgot-password__heading">
          {t("features.forgotPassword.heading")}
        </h1>
        <p className="p-auth-forgot-password__description">
          {t("features.forgotPassword.description")}
        </p>
      </div>
      <div className="p-auth-forgot-password__body">
        <div className="p-auth-forgot-password__body-form">
          <Form
            error={serverError}
            handleSubmit={handleSubmit}
            onSubmit={onSubmit}
          >
            <FormFields>
              <Input
                autoComplete="email"
                error={errors.email}
                hideLabel
                label={t("features.login.form.email")}
                name="email"
                placeholder={t("features.login.form.email")}
                register={register}
                required={t("features.login.form.error.invalidEmail")}
                type="email"
              />
            </FormFields>

            <FormActions>
              <Button
                className="p-auth-forgot-password__submit"
                display="block"
                isProcessing={submitting}
                type="submit"
              >
                {t("features.forgotPassword.form.submit")}
              </Button>
            </FormActions>
          </Form>
        </div>
        <div className="p-auth-forgot-password__body-back">
          <Link
            className="p-auth-forgot-password__body-back-link"
            to={ROUTES.LOGIN}
          >
            {t("features.forgotPassword.backToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
