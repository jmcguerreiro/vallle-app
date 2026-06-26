import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import EmptyState from "@/components/EmptyState";
import Form from "@/components/forms/Form";
import FormFields from "@/components/forms/FormFields";
import Input from "@/components/forms/Input";
import MultiSelect from "@/components/forms/MultiSelect";
import Select from "@/components/forms/Select";
import Loader from "@/components/Loader";
import { LOCALE_OPTIONS } from "@/constants/locales";
import { ACCOUNT_ROLES, STORE_ROLES } from "@/constants/user-roles";
import { USER_STATUSES } from "@/constants/user-statuses";
import { useAuth } from "@/hooks/useAuth";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/hooks/useToast";
import { get, put } from "@/services/api";

/**
 * Component: AdminUserEdit
 * Form for editing a user's identity, account type (platform super admin vs
 * regular account), account status, and the companies they belong to — assigned
 * through the same multiselect + per-company role used when creating a user.
 * Super admin only.
 * @component
 * @returns {JSX.Element}
 */
const AdminUserEdit = () => {
  // Hooks
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setHeader } = useModal();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useForm();

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["admin", "users", id],
    queryFn: ({ signal }) => get(`/api/admin/users/${id}`, { signal }),
  });

  const { data: companiesResponse } = useQuery({
    queryKey: ["admin", "companies"],
    queryFn: ({ signal }) => get("/api/admin/companies?limit=200", { signal }),
  });

  const companies = companiesResponse?.data ?? [];

  // Mutations
  const updateUser = useMutation({
    mutationFn: (values) => put(`/api/admin/users/${id}`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      addToast(t("features.admin.users.edit.success"), "success");
      navigate(-1);
    },
    onError: (error) => {
      setServerError(
        error.code === "EMAIL_TAKEN"
          ? t("features.admin.users.error.emailTaken")
          : error.message || t("features.admin.users.edit.error.generic"),
      );
    },
  });

  // The mutation result object is a fresh reference every render; only the
  // stable mutate function may be a hook dependency, otherwise the header
  // effect (setHeader → context update → re-render) loops forever.
  const { mutate: update } = updateUser;

  // State
  const [serverError, setServerError] = useState(null);

  // Derived State
  // You can't change your OWN account type or status (avoids locking yourself
  // out of the platform). Store memberships are always editable.
  const isSelf = user?.id === id;
  // Account role is now just the platform flag: super admin or regular account.
  // The admin/user distinction lives per store, below.
  const accountTypeOptions = [
    {
      value: ACCOUNT_ROLES.SUPER_ADMIN,
      label: t("features.admin.users.form.accountType_super_admin"),
    },
    {
      value: ACCOUNT_ROLES.USER,
      label: t("features.admin.users.form.accountType_regular"),
    },
  ];
  const statusOptions = [
    {
      value: USER_STATUSES.ACTIVE,
      label: t("features.admin.users.list.active"),
    },
    {
      value: USER_STATUSES.INACTIVE,
      label: t("features.admin.users.list.inactive"),
    },
  ];
  const storeRoleOptions = [
    { value: STORE_ROLES.ADMIN, label: t("roles.admin") },
    { value: STORE_ROLES.USER, label: t("roles.user") },
  ];
  const companyOptions = companies.map((c) => ({ value: c.id, label: c.name }));
  const selectedStoreIds = watch("store_ids");

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
      update({
        name: values.name,
        email: values.email,
        role: values.role,
        status: values.status,
        locale: values.locale,
        stores,
      });
    },
    [update],
  );

  // Effects
  useEffect(() => {
    setHeader({
      title: t("features.admin.users.edit.heading"),
      description: t("features.admin.users.edit.description"),
      actions: response?.data
        ? [
            {
              label: t("features.admin.users.edit.submit"),
              onClick: handleSubmit(onSubmit),
              skin: "primary",
              isProcessing: updateUser.isPending,
            },
          ]
        : [],
    });
    return () => setHeader();
  }, [setHeader, t, response, handleSubmit, onSubmit, updateUser.isPending]);

  useEffect(() => {
    if (response?.data) {
      const { user: editedUser } = response.data;
      const storeIds = [];
      const storeRoles = {};
      for (const s of editedUser.stores ?? []) {
        storeIds.push(s.store_id);
        storeRoles[s.store_id] = s.role;
      }
      reset({
        name: editedUser.name,
        email: editedUser.email,
        // Legacy account role "admin" collapses to a regular account; only
        // super_admin maps to the platform flag.
        role:
          editedUser.role === ACCOUNT_ROLES.SUPER_ADMIN
            ? ACCOUNT_ROLES.SUPER_ADMIN
            : ACCOUNT_ROLES.USER,
        status: editedUser.status,
        locale: editedUser.locale || "pt",
        store_ids: storeIds,
        store_roles: storeRoles,
      });
    }
  }, [response, reset]);

  // Default each newly-selected company's role to admin so the per-company role
  // selects never render empty.
  useEffect(() => {
    for (const storeId of selectedStoreIds || []) {
      if (getValues(`store_roles.${storeId}`) === undefined) {
        setValue(`store_roles.${storeId}`, STORE_ROLES.ADMIN);
      }
    }
  }, [selectedStoreIds, getValues, setValue]);

  // Render
  if (isPending) {
    return (
      <div className="c-page-state">
        <Loader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="c-page-state">
        <EmptyState
          description={t("common.error")}
          hideImageOnMobile
          image="users--error"
        />
      </div>
    );
  }

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
        <Select
          control={control}
          disabled={isSelf}
          error={errors.role}
          hint={isSelf ? t("features.admin.users.form.selfLocked") : undefined}
          label={t("features.admin.users.form.accountType")}
          name="role"
          options={accountTypeOptions}
          placeholder={t("features.admin.users.form.accountType")}
        />
        <Select
          control={control}
          disabled={isSelf}
          error={errors.status}
          label={t("features.admin.users.form.accountStatus")}
          name="status"
          options={statusOptions}
          placeholder={t("features.admin.users.form.accountStatus")}
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
    </Form>
  );
};

export default AdminUserEdit;
