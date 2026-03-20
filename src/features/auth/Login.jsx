import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useNavigate } from "react-router-dom";

import Form from "@/components/forms/Form";
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
    <div className="c-login">
      <div className="c-login__card">
        <h1 className="c-login__heading">{t("features.login.heading")}</h1>

        <Form
          className="c-login__form"
          error={serverError}
          handleSubmit={handleSubmit}
          onSubmit={onSubmit}
        >
          <Input
            autoComplete="email"
            error={errors.email}
            label={t("features.login.form.email")}
            name="email"
            register={register}
            required={t("features.login.form.error.invalidEmail")}
            type="email"
          />

          <Input
            autoComplete="current-password"
            error={errors.password}
            label={t("features.login.form.password")}
            name="password"
            register={register}
            required
            type="password"
          />

          <button
            className="c-login__submit"
            disabled={submitting}
            type="submit"
          >
            {submitting ? t("common.loading") : t("features.login.form.submit")}
          </button>
        </Form>

        <Link className="c-login__link" to={ROUTES.FORGOT_PASSWORD}>
          {t("features.login.forgotPassword")}
        </Link>
      </div>
    </div>
  );
};

export default Login;
