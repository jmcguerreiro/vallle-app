import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import EmptyState from "@/components/EmptyState";
import Form from "@/components/forms/Form";
import FormFields from "@/components/forms/FormFields";
import Input from "@/components/forms/Input";
import Select from "@/components/forms/Select";
import Loader from "@/components/Loader";
import { LOCALE_OPTIONS } from "@/constants/locales";
import { USER_ROLES } from "@/constants/user-roles";
import { USER_STATUSES } from "@/constants/user-statuses";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/hooks/useToast";
import { get, put } from "@/services/api";

/**
 * Component: CompanyUserEdit
 * Modal form for editing a user belonging to the active store.
 * Available to admin role only. The save button lives in the modal/drawer
 * footer (via the header actions), not in the form body.
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
    control,
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

  // The mutation result object is a fresh reference every render; only the
  // stable mutate function may be a hook dependency, otherwise the header
  // effect (setHeader → context update → re-render) loops forever.
  const { mutate: update } = updateUser;

  // State
  const [serverError, setServerError] = useState(null);

  // Derived State
  const roleOptions = [
    {
      value: USER_ROLES.USER,
      label: t("features.company.users.list.role_user"),
    },
    {
      value: USER_ROLES.ADMIN,
      label: t("features.company.users.list.role_admin"),
    },
  ];
  const statusOptions = [
    {
      value: USER_STATUSES.ACTIVE,
      label: t("features.company.users.list.active"),
    },
    {
      value: USER_STATUSES.INACTIVE,
      label: t("features.company.users.list.inactive"),
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
      title: t("features.company.users.edit.heading"),
      description: t("features.company.users.edit.description"),
      actions: response?.data
        ? [
            {
              label: t("features.company.users.edit.submit"),
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
          autoComplete="off"
          error={errors.email}
          label={t("features.company.users.form.email")}
          name="email"
          register={register}
          required={t("features.company.users.form.error.emailRequired")}
          type="email"
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
          error={errors.status}
          label={t("features.company.users.list.status")}
          name="status"
          options={statusOptions}
          placeholder={t("features.company.users.list.status")}
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
    </Form>
  );
};

export default CompanyUserEdit;
