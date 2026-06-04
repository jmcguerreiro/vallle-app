import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import Form from "@/components/forms/Form";
import FormActions from "@/components/forms/FormActions";
import FormFields from "@/components/forms/FormFields";
import Input from "@/components/forms/Input";
import Loader from "@/components/Loader";
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

  // State
  const [serverError, setServerError] = useState(null);

  // Derived State

  // Handlers
  const onSubmit = useCallback(
    (values) => {
      setServerError(null);
      updateUser.mutate(values);
    },
    [updateUser],
  );

  // Effects
  useEffect(() => {
    setHeader({
      title: t("features.admin.users.edit.heading"),
      description: t("features.admin.users.edit.description"),
    });
    return () => setHeader();
  }, [setHeader, t]);

  useEffect(() => {
    if (response?.data) {
      const { user } = response.data;
      reset({
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
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
          error={errors.email}
          label={t("features.admin.users.form.email")}
          name="email"
          register={register}
          required={t("features.admin.users.form.error.emailRequired")}
          type="email"
        />
        <div className="c-form__field">
          <label className="c-form__field-label" htmlFor="role">
            {t("features.admin.users.form.role")}
          </label>
          <select
            className="c-form__field-input"
            id="role"
            {...register("role")}
          >
            <option value="user">
              {t("features.admin.users.list.role_user")}
            </option>
            <option value="admin">
              {t("features.admin.users.list.role_admin")}
            </option>
            <option value="super_admin">
              {t("features.admin.users.list.role_super_admin")}
            </option>
          </select>
        </div>
        <div className="c-form__field">
          <label className="c-form__field-label" htmlFor="status">
            {t("features.admin.users.list.status")}
          </label>
          <select
            className="c-form__field-input"
            id="status"
            {...register("status")}
          >
            <option value="active">
              {t("features.admin.users.list.active")}
            </option>
            <option value="inactive">
              {t("features.admin.users.list.inactive")}
            </option>
          </select>
        </div>
      </FormFields>

      {userStores.length > 0 && (
        <div className="c-admin-user-stores">
          <p className="c-admin-user-stores__label">
            {t("features.admin.users.edit.assignedTo")}
          </p>
          <ul className="c-admin-user-stores__list">
            {userStores.map((s) => (
              <li key={s.store_id} className="c-admin-user-stores__item">
                {s.store_name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <FormActions>
        <Button isProcessing={updateUser.isPending} type="submit">
          {t("features.admin.users.edit.submit")}
        </Button>
        <Button onClick={() => navigate(-1)} variant="ghost">
          {t("common.cancel")}
        </Button>
      </FormActions>
    </Form>
  );
};

export default AdminUserEdit;
