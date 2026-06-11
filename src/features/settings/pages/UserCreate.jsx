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
    formState: { errors },
  } = useForm();

  // Mutations
  const createUser = useMutation({
    mutationFn: (values) =>
      post("/api/company/users", {
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
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
        <Input
          error={errors.password}
          label={t("features.company.users.form.password")}
          name="password"
          register={register}
          required={t("features.company.users.form.error.passwordRequired")}
          type="password"
          validate={validatePassword(t)}
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
