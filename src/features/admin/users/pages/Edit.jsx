import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";
import Form from "@/components/forms/Form";
import FormFields from "@/components/forms/FormFields";
import Input from "@/components/forms/Input";
import Select from "@/components/forms/Select";
import List from "@/components/List";
import Loader from "@/components/Loader";
import { LOCALE_OPTIONS } from "@/constants/locales";
import { USER_ROLES } from "@/constants/user-roles";
import { USER_STATUSES } from "@/constants/user-statuses";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/hooks/useToast";
import { get, put } from "@/services/api";

/**
 * Component: AdminUserEdit
 * Form for editing a user's name, email, role, and status.
 * Super admin only.
 * @component
 * @returns {JSX.Element}
 */
const AdminUserEdit = () => {
  // Hooks
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
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

  const userStores = response?.data?.user?.stores ?? [];

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

  // Handlers
  const onSubmit = useCallback(
    (values) => {
      setServerError(null);
      update(values);
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
      const { user } = response.data;
      reset({
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        locale: user.locale || "pt",
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
          error={errors.role}
          label={t("features.admin.users.form.role")}
          name="role"
          options={roleOptions}
          placeholder={t("features.admin.users.form.role")}
        />
        <Select
          control={control}
          error={errors.status}
          label={t("features.admin.users.list.status")}
          name="status"
          options={statusOptions}
          placeholder={t("features.admin.users.list.status")}
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

      {userStores.length > 0 && (
        <Card
          description={t("features.admin.users.edit.assignedToDescription")}
          title={t("features.admin.users.edit.assignedTo")}
        >
          <List>
            {userStores.map((s) => (
              <List.Item key={s.store_id}>{s.store_name}</List.Item>
            ))}
          </List>
        </Card>
      )}
    </Form>
  );
};

export default AdminUserEdit;
