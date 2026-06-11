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
 * Component: CompanyUserEdit
 * Modal form for editing a user belonging to the active store.
 * Available to admin role only.
 * @component
 * @returns {JSX.Element}
 */
const CompanyUserEdit = () => {
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
    queryKey: ["company", "users", id],
    queryFn: ({ signal }) => get(`/api/company/users/${id}`, { signal }),
  });

  // Mutations
  const updateUser = useMutation({
    mutationFn: (values) => put(`/api/company/users/${id}`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", "users"] });
      addToast(t("features.company.users.edit.success"), "success");
      navigate(-1);
    },
    onError: (error) => {
      setServerError(
        error.code === "EMAIL_TAKEN"
          ? t("features.company.users.error.emailTaken")
          : error.message || t("features.company.users.edit.error.generic"),
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
      title: t("features.company.users.edit.heading"),
      description: t("features.company.users.edit.description"),
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
          image="company-users--error"
        />
      </div>
    );
  }

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
          error={errors.email}
          label={t("features.company.users.form.email")}
          name="email"
          register={register}
          required={t("features.company.users.form.error.emailRequired")}
          type="email"
        />
        <div className="c-form__field">
          <label className="c-form__field-label" htmlFor="role">
            {t("features.company.users.form.role")}
          </label>
          <select
            className="c-form__field-input"
            id="role"
            {...register("role")}
          >
            <option value="user">
              {t("features.company.users.list.role_user")}
            </option>
            <option value="admin">
              {t("features.company.users.list.role_admin")}
            </option>
          </select>
        </div>
        <div className="c-form__field">
          <label className="c-form__field-label" htmlFor="status">
            {t("features.company.users.list.status")}
          </label>
          <select
            className="c-form__field-input"
            id="status"
            {...register("status")}
          >
            <option value="active">
              {t("features.company.users.list.active")}
            </option>
            <option value="inactive">
              {t("features.company.users.list.inactive")}
            </option>
          </select>
        </div>
      </FormFields>
      <FormActions>
        <Button isProcessing={updateUser.isPending} type="submit">
          {t("features.company.users.edit.submit")}
        </Button>
        <Button onClick={() => navigate(-1)} skin="ghost">
          {t("common.cancel")}
        </Button>
      </FormActions>
    </Form>
  );
};

export default CompanyUserEdit;
