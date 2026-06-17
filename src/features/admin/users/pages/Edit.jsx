import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";
import Fieldset from "@/components/forms/Fieldset";
import Form from "@/components/forms/Form";
import FormFields from "@/components/forms/FormFields";
import Input from "@/components/forms/Input";
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
 * regular account), account status, and their role + status within each store
 * they belong to. Super admin only.
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
  // out of the platform). Store-scoped role/status are always editable — a
  // super_admin's platform access doesn't depend on any store membership.
  const isSelf = user?.id === id;
  const userStores = response?.data?.user?.stores ?? [];
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
    {
      value: STORE_ROLES.ADMIN,
      label: t("features.admin.users.list.role_admin"),
    },
    {
      value: STORE_ROLES.USER,
      label: t("features.admin.users.list.role_user"),
    },
  ];

  // Handlers
  const onSubmit = useCallback(
    (values) => {
      setServerError(null);
      // Flatten the per-store object (keyed by store_id) into the array the API
      // expects: [{ store_id, role, status }].
      const stores = Object.entries(values.stores ?? {}).map(
        ([store_id, membership]) => ({
          store_id,
          role: membership.role,
          status: membership.status,
        }),
      );
      update({ ...values, stores });
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
      // Legacy account role "admin" collapses to a regular account; only
      // super_admin maps to the platform flag.
      const stores = {};
      for (const s of editedUser.stores ?? []) {
        stores[s.store_id] = { role: s.role, status: s.status };
      }
      reset({
        name: editedUser.name,
        email: editedUser.email,
        role:
          editedUser.role === ACCOUNT_ROLES.SUPER_ADMIN
            ? ACCOUNT_ROLES.SUPER_ADMIN
            : ACCOUNT_ROLES.USER,
        status: editedUser.status,
        locale: editedUser.locale || "pt",
        stores,
      });
    }
  }, [response, reset]);

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
      </FormFields>

      <Card
        description={t("features.admin.users.edit.storeAccessDescription")}
        title={t("features.admin.users.edit.storeAccess")}
      >
        {userStores.length === 0 ? (
          <p className="c-form__hint">
            {t("features.admin.users.edit.noStores")}
          </p>
        ) : (
          userStores.map((s) => (
            <Fieldset key={s.store_id} legend={s.store_name}>
              <FormFields>
                <Select
                  control={control}
                  error={errors.stores?.[s.store_id]?.role}
                  label={t("features.admin.users.form.storeRole")}
                  name={`stores.${s.store_id}.role`}
                  options={storeRoleOptions}
                  placeholder={t("features.admin.users.form.storeRole")}
                />
                <Select
                  control={control}
                  error={errors.stores?.[s.store_id]?.status}
                  label={t("features.admin.users.form.storeStatus")}
                  name={`stores.${s.store_id}.status`}
                  options={statusOptions}
                  placeholder={t("features.admin.users.form.storeStatus")}
                />
              </FormFields>
            </Fieldset>
          ))
        )}
      </Card>
    </Form>
  );
};

export default AdminUserEdit;
