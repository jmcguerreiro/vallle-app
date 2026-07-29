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
import MultiSelect from "@/components/forms/MultiSelect";
import Select from "@/components/forms/Select";
import { LOCALE_OPTIONS } from "@/constants/locales";
import { ACCOUNT_ROLES, STORE_ROLES } from "@/constants/user-roles";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/hooks/useToast";
import { get, post } from "@/services/api";
import { validatePassword } from "@/utils/password";

/**
 * Component: AdminUserCreate
 * Form for creating a new user and optionally assigning them to one or more
 * companies, each with its own store role. Super admin only.
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
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      role: ACCOUNT_ROLES.USER,
      locale: "pt",
      store_ids: [],
      store_roles: {},
    },
  });

  // Queries
  const { data: companiesResponse } = useQuery({
    queryKey: ["admin", "companies"],
    queryFn: ({ signal }) => get("/api/admin/companies?limit=200", { signal }),
  });

  const companies = companiesResponse?.data ?? [];

  // Mutations
  const createUser = useMutation({
    mutationFn: (payload) => post("/api/admin/users", payload),
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
  const accountTypeOptions = [
    {
      value: ACCOUNT_ROLES.USER,
      label: t("features.admin.users.form.accountType_regular"),
    },
    {
      value: ACCOUNT_ROLES.SUPER_ADMIN,
      label: t("features.admin.users.form.accountType_super_admin"),
    },
  ];
  const storeRoleOptions = [
    { value: STORE_ROLES.ADMIN, label: t("roles.admin") },
    { value: STORE_ROLES.USER, label: t("roles.user") },
  ];
  const companyOptions = companies.map((c) => ({ value: c.id, label: c.name }));
  const selectedStoreIds = watch("store_ids");

  // Depend on the stable mutate fn, not the mutation result object (a fresh
  // reference each render).
  const { mutate: create } = createUser;

  // Handlers
  const onSubmit = useCallback(
    (values) => {
      setServerError(null);
      const stores = (values.store_ids || []).map((storeId) => ({
        store_id: storeId,
        role:
          values.store_roles?.[storeId] === STORE_ROLES.USER
            ? STORE_ROLES.USER
            : STORE_ROLES.ADMIN,
      }));
      create({
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
        locale: values.locale,
        stores,
      });
    },
    [create],
  );

  // Effects
  useEffect(() => {
    setHeader({ title, description });
    return () => setHeader();
  }, [title, description, setHeader]);

  // Default each newly-selected company's role to admin so the per-company role
  // selects never render empty.
  useEffect(() => {
    for (const id of selectedStoreIds || []) {
      if (getValues(`store_roles.${id}`) === undefined) {
        setValue(`store_roles.${id}`, STORE_ROLES.ADMIN);
      }
    }
  }, [selectedStoreIds, getValues, setValue]);

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
          label={t("features.admin.users.form.accountType")}
          name="role"
          options={accountTypeOptions}
          placeholder={t("features.admin.users.form.accountType")}
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
          <>
            <MultiSelect
              control={control}
              error={errors.store_ids}
              label={t("features.admin.users.form.companies")}
              name="store_ids"
              options={companyOptions}
              placeholder={t("features.admin.users.form.companiesPlaceholder")}
            />
            {(selectedStoreIds || []).map((storeId) => {
              const company = companies.find((c) => c.id === storeId);
              if (!company) return null;
              return (
                <Select
                  key={storeId}
                  control={control}
                  label={`${company.name} — ${t("features.admin.users.form.storeRole")}`}
                  name={`store_roles.${storeId}`}
                  options={storeRoleOptions}
                  placeholder={t("features.admin.users.form.storeRole")}
                />
              );
            })}
          </>
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
