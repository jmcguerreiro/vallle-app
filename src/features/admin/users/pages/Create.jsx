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
    formState: { errors },
  } = useForm();

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
          error={errors.email}
          label={t("features.admin.users.form.email")}
          name="email"
          register={register}
          required={t("features.admin.users.form.error.emailRequired")}
          type="email"
        />
        <Input
          error={errors.password}
          label={t("features.admin.users.form.password")}
          name="password"
          register={register}
          required={t("features.admin.users.form.error.passwordRequired")}
          type="password"
          validate={validatePassword(t)}
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
        {companies.length > 0 && (
          <div className="c-form__field">
            <label className="c-form__field-label" htmlFor="store_id">
              {t("features.admin.users.form.company")}
            </label>
            <select
              className="c-form__field-input"
              id="store_id"
              {...register("store_id")}
            >
              <option value="">
                {t("features.admin.users.form.noCompany")}
              </option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </FormFields>
      <FormActions>
        <Button isProcessing={createUser.isPending} type="submit">
          {t("features.admin.users.create.submit")}
        </Button>
        <Button onClick={() => navigate(-1)} variant="ghost">
          {t("common.cancel")}
        </Button>
      </FormActions>
    </Form>
  );
};

export default AdminUserCreate;
