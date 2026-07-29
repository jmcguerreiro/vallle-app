import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/Button";
import Form from "@/components/forms/Form";
import FormActions from "@/components/forms/FormActions";
import FormFields from "@/components/forms/FormFields";
import Input from "@/components/forms/Input";
import Select from "@/components/forms/Select";
import { LOCALE_OPTIONS } from "@/constants/locales";
import { STORE_ROLES } from "@/constants/user-roles";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/hooks/useToast";
import { post } from "@/services/api";
import { validatePassword } from "@/utils/password";

/**
 * Component: CompanyUserCreate
 * Modal form for creating a new user and assigning them to the active store.
 * Available to admin role only.
 * @component
 * @returns {JSX.Element}
 */
const CompanyUserCreate = () => {
  // Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setHeader } = useModal();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      role: STORE_ROLES.USER,
      locale: "pt",
    },
  });

  // Mutations
  const createUser = useMutation({
    mutationFn: (values) =>
      post("/api/company/users", {
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
        locale: values.locale,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", "users"] });
      addToast(t("features.company.users.create.success"), "success");
      navigate(-1);
    },
    onError: (error) => {
      setServerError(
        error.code === "EMAIL_TAKEN"
          ? t("features.company.users.error.emailTaken")
          : error.message || t("features.company.users.create.error.generic"),
      );
    },
  });

  // State
  const [serverError, setServerError] = useState(null);

  // Derived State
  const title = t("features.company.users.create.heading");
  const description = t("features.company.users.create.description");
  const roleOptions = [
    {
      value: STORE_ROLES.USER,
      label: t("roles.user"),
    },
    {
      value: STORE_ROLES.ADMIN,
      label: t("roles.admin"),
    },
  ];

  // Depend on the stable mutate fn, not the mutation result object (a fresh
  // reference each render).
  const { mutate: create } = createUser;

  // Handlers
  const onSubmit = useCallback(
    (values) => {
      setServerError(null);
      create(values);
    },
    [create],
  );

  // Effects
  useEffect(() => {
    setHeader({ title, description });
    return () => setHeader();
  }, [title, description, setHeader]);

  // Render
  return (
    <Form error={serverError} handleSubmit={handleSubmit} onSubmit={onSubmit}>
      <FormFields>
        <Input
          error={errors.name}
          label={t("features.company.users.form.name")}
          name="name"
          register={register}
          required={t("features.company.users.form.error.nameRequired")}
        />
        <Input
          autoComplete="off"
          error={errors.email}
          label={t("features.company.users.form.email")}
          name="email"
          register={register}
          required={t("features.company.users.form.error.emailRequired")}
          type="email"
        />
        <Input
          autoComplete="new-password"
          error={errors.password}
          label={t("features.company.users.form.password")}
          name="password"
          register={register}
          required={t("features.company.users.form.error.passwordRequired")}
          type="password"
          validate={validatePassword(t)}
        />
        <Select
          control={control}
          error={errors.role}
          label={t("features.company.users.form.role")}
          name="role"
          options={roleOptions}
          placeholder={t("features.company.users.form.role")}
        />
        <Select
          control={control}
          error={errors.locale}
          label={t("features.company.users.form.language")}
          name="locale"
          options={LOCALE_OPTIONS}
          placeholder={t("features.company.users.form.language")}
        />
      </FormFields>
      <FormActions>
        <Button isProcessing={createUser.isPending} type="submit">
          {t("features.company.users.create.submit")}
        </Button>
        <Button onClick={() => navigate(-1)} skin="ghost">
          {t("common.cancel")}
        </Button>
      </FormActions>
    </Form>
  );
};

export default CompanyUserCreate;
