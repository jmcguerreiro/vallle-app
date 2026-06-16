import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/Button";
import Form from "@/components/forms/Form";
import FormActions from "@/components/forms/FormActions";
import FormFields from "@/components/forms/FormFields";
import Input from "@/components/forms/Input";
import Select from "@/components/forms/Select";
import { LOCALE_OPTIONS } from "@/constants/locales";
import { USER_ROLES } from "@/constants/user-roles";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/hooks/useToast";
import { get, post } from "@/services/api";
import { validatePassword } from "@/utils/password";

/**
 * Component: AdminUserCreate
 * Form for creating a new user and optionally assigning them to a company.
 * Super admin only.
 * @component
 * @returns {JSX.Element}
 */
const AdminUserCreate = () => {
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
      role: USER_ROLES.USER,
      locale: "pt",
      store_id: "",
    },
  });

  // Queries
  const { data: companiesResponse } = useQuery({
    queryKey: ["admin", "companies"],
    queryFn: ({ signal }) => get("/api/admin/companies", { signal }),
  });

  const companies = companiesResponse?.data ?? [];

  // Mutations
  const createUser = useMutation({
    mutationFn: (values) =>
      post("/api/admin/users", {
        ...values,
        store_id: values.store_id || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      addToast(t("features.admin.users.create.success"), "success");
      navigate(-1);
    },
    onError: (error) => {
      setServerError(
        error.code === "EMAIL_TAKEN"
          ? t("features.admin.users.error.emailTaken")
          : error.message || t("features.admin.users.create.error.generic"),
      );
    },
  });

  // State
  const [serverError, setServerError] = useState(null);

  // Derived State
  const title = t("features.admin.users.create.heading");
  const description = t("features.admin.users.create.description");
  const roleOptions = [
    { value: USER_ROLES.USER, label: t("features.admin.users.list.role_user") },
    {
      value: USER_ROLES.ADMIN,
      label: t("features.admin.users.list.role_admin"),
    },
    {
      value: USER_ROLES.SUPER_ADMIN,
      label: t("features.admin.users.list.role_super_admin"),
    },
  ];
  const companyOptions = [
    { value: "", label: t("features.admin.users.form.noCompany") },
    ...companies.map((c) => ({ value: c.id, label: c.name })),
  ];

  // Handlers
  const onSubmit = useCallback(
    (values) => {
      setServerError(null);
      createUser.mutate(values);
    },
    [createUser],
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
          label={t("features.admin.users.form.name")}
          name="name"
          register={register}
          required={t("features.admin.users.form.error.nameRequired")}
        />
        <Input
          autoComplete="off"
          error={errors.email}
          label={t("features.admin.users.form.email")}
          name="email"
          register={register}
          required={t("features.admin.users.form.error.emailRequired")}
          type="email"
        />
        <Input
          autoComplete="new-password"
          error={errors.password}
          label={t("features.admin.users.form.password")}
          name="password"
          register={register}
          required={t("features.admin.users.form.error.passwordRequired")}
          type="password"
          validate={validatePassword(t)}
        />
        <Select
          control={control}
          error={errors.role}
          label={t("features.admin.users.form.role")}
          name="role"
          options={roleOptions}
          placeholder={t("features.admin.users.form.role")}
        />
        <Select
          control={control}
          error={errors.locale}
          label={t("features.admin.users.form.language")}
          name="locale"
          options={LOCALE_OPTIONS}
          placeholder={t("features.admin.users.form.language")}
        />
        {companies.length > 0 && (
          <Select
            control={control}
            error={errors.store_id}
            label={t("features.admin.users.form.company")}
            name="store_id"
            options={companyOptions}
            placeholder={t("features.admin.users.form.noCompany")}
          />
        )}
      </FormFields>
      <FormActions>
        <Button isProcessing={createUser.isPending} type="submit">
          {t("features.admin.users.create.submit")}
        </Button>
        <Button onClick={() => navigate(-1)} skin="ghost">
          {t("common.cancel")}
        </Button>
      </FormActions>
    </Form>
  );
};

export default AdminUserCreate;
