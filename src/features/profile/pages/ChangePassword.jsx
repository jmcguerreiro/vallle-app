import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useMutation } from "@tanstack/react-query";

import Button from "@/components/Button";
import Form from "@/components/forms/Form";
import Input from "@/components/forms/Input";
import { useMain } from "@/hooks/useMain";
import { useModal } from "@/hooks/useModal";
import { put } from "@/services/api";
import { validatePassword } from "@/utils/password";

/**
 * Component: ChangePassword
 * Modal content for changing the user's password.
 * Sets the header title on the modal or main layout depending on context.
 * @component
 * @returns {JSX.Element}
 */
const ChangePassword = () => {
  // Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setHeader: setMainHeader } = useMain();
  const { setHeader: setModalHeader, isModal } = useModal();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // Mutations
  const changePassword = useMutation({
    mutationFn: (values) =>
      put("/api/profile/password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => navigate(-1), 1500);
    },
    onError: (error) => {
      setServerError(
        error.code === "WRONG_PASSWORD"
          ? t("features.profile.password.error.wrongPassword")
          : t("features.profile.password.error.generic"),
      );
    },
  });

  // State
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);

  // Derived State
  const title = t("features.profile.password.heading");
  const description = t("features.profile.password.description");
  const setHeader = isModal ? setModalHeader : setMainHeader;
  const passwordRules = useMemo(() => validatePassword(t), [t]);

  // Handlers
  const handleSave = useCallback(
    (values) => {
      setServerError("");
      setSuccess(false);
      changePassword.mutate(values);
    },
    [changePassword],
  );

  // Effects
  useEffect(() => {
    setHeader({ title, description });
    return () => setHeader();
  }, [title, description, setHeader]);

  // Render
  return (
    <Form error={serverError} handleSubmit={handleSubmit} onSubmit={handleSave}>
      <p className="c-form__hint">
        {t("features.profile.password.requirements")}
      </p>
      <Input
        autoComplete="current-password"
        error={errors.currentPassword}
        label={t("features.profile.password.currentPassword")}
        name="currentPassword"
        register={register}
        required={t("features.profile.password.error.currentRequired")}
        type="password"
      />
      <Input
        autoComplete="new-password"
        error={errors.newPassword}
        label={t("features.profile.password.newPassword")}
        name="newPassword"
        register={register}
        required={t("features.profile.password.error.newRequired")}
        type="password"
        validate={passwordRules}
      />
      <Button isProcessing={changePassword.isPending} type="submit">
        {t("features.profile.password.submit")}
      </Button>
      {success && (
        <p className="c-form__success">
          {t("features.profile.password.success")}
        </p>
      )}
    </Form>
  );
};

export default ChangePassword;
