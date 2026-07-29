import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useMutation } from "@tanstack/react-query";

import Button from "@/components/Button";
import Form from "@/components/forms/Form";
import Input from "@/components/forms/Input";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/hooks/useToast";
import { put } from "@/services/api";
import { validatePassword } from "@/utils/password";

/**
 * Component: ChangePassword
 * Modal content for changing the user's password.
 * Sets the modal header title.
 * @component
 * @returns {JSX.Element}
 */
const ChangePassword = () => {
  // Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setHeader } = useModal();
  const { addToast } = useToast();
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
      addToast(t("features.profile.password.success"), "success");
      navigate(-1);
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

  // Derived State
  const title = t("features.profile.password.heading");
  const description = t("features.profile.password.description");
  const passwordRules = useMemo(() => validatePassword(t), [t]);

  // Depend on the stable mutate fn, not the mutation result object (a fresh
  // reference each render).
  const { mutate: save } = changePassword;

  // Handlers
  const handleSave = useCallback(
    (values) => {
      setServerError("");
      save(values);
    },
    [save],
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
    </Form>
  );
};

export default ChangePassword;
