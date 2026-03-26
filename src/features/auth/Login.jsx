import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useNavigate } from "react-router-dom";

import Button from "@/components/Button";
import Form from "@/components/forms/Form";
import FormActions from "@/components/forms/FormActions";
import FormFields from "@/components/forms/FormFields";
import Input from "@/components/forms/Input";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";

/**
 * Component: Login
 * Email + password login form. Redirects to dashboard on success.
 * @component
 * @returns {JSX.Element}
 */
const Login = () => {
  // Hooks
  const { t } = useTranslation();
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // State
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Handlers
  const onSubmit = useCallback(
    async ({ email, password }) => {
      setServerError("");
      setSubmitting(true);

      try {
        const loggedInUser = await login(email, password);
        if (loggedInUser.stores?.length > 1) {
          navigate(ROUTES.SELECT_STORE);
        } else {
          navigate(ROUTES.HOME);
        }
      } catch (error) {
        if (error.code === "AUTH_INVALID_CREDENTIALS") {
          setServerError(t("features.login.form.error.invalidCredentials"));
        } else {
          setServerError(t("features.login.form.error.generic"));
        }
      } finally {
        setSubmitting(false);
      }
    },
    [login, navigate, t],
  );

  // Render
  if (loading) {
    return <div className="c-loading">{t("common.loading")}</div>;
  }

  if (isAuthenticated) {
    return <Navigate replace to={ROUTES.HOME} />;
  }

  return (
    <div className="p-auth-login">
      <div className="p-auth-login__logo">
        <img
          alt=""
          className="p-auth-login__logo-image"
          src="/images/logo.svg"
        />
      </div>
      <div className="p-auth-login__body">
        <div className="p-auth-login__body-form">
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

              <Input
                autoComplete="current-password"
                error={errors.password}
                hideLabel
                label={t("features.login.form.password")}
                name="password"
                placeholder={t("features.login.form.password")}
                register={register}
                required
                type="password"
              />
            </FormFields>

            <FormActions>
              <Button
                className="p-auth-login__submit"
                display="block"
                isProcessing={submitting}
                type="submit"
              >
                {t("features.login.form.submit")}
              </Button>
            </FormActions>
          </Form>
        </div>
        <div className="p-auth-login__body-forgotten">
          <Link
            className="p-auth-login__body-forgotten-link"
            to={ROUTES.FORGOT_PASSWORD}
          >
            {t("features.login.forgotPassword")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
