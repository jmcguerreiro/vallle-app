import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

import { useMutation, useQuery } from "@tanstack/react-query";

import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import Fieldset from "@/components/forms/Fieldset";
import Form from "@/components/forms/Form";
import FormActions from "@/components/forms/FormActions";
import FormFields from "@/components/forms/FormFields";
import Input from "@/components/forms/Input";
import Select from "@/components/forms/Select";
import Loader from "@/components/Loader";
import { LOCALE_OPTIONS } from "@/constants/locales";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { useMain } from "@/hooks/useMain";
import { useToast } from "@/hooks/useToast";
import { get, put } from "@/services/api";

const AVATAR_NAMES = [
  "paper-bag-head",
  "alien-cap",
  "cat-glasses",
  "chef-bearded",
  "cow-glasses-suit",
  "crocodile-cap",
  "deer-sunglasses",
  "duck-in-suit",
  "elder-man-glasses",
  "elephant-beret",
  "fishbowl-head",
  "fox-glasses-tie",
  "grandma-scarf",
  "horse-in-suit",
  "lion-beanie",
  "man-astronaut",
  "man-curly-rainbow-tee",
  "man-curly-stubble",
  "man-curly-tie",
  "man-dark-scarf",
  "man-dark-turtleneck",
  "man-flat-cap",
  "man-glasses-tie",
  "man-heart-necklace",
  "man-heart-tattoo",
  "man-mohawk",
  "man-swept-hair",
  "man-wavy-scarf",
  "person-balaclava",
  "person-curly-glasses",
  "person-half-up-hair",
  "person-hoodie",
  "person-ponytail",
  "pig-in-blazer",
  "rabbit-in-suit",
  "rhino-sunglasses",
  "robot-heart",
  "robot-lightning",
  "rooster-sunglasses",
  "vulture-cowboy-hat",
  "woman-astronaut",
  "woman-athletic-knot",
  "woman-bob",
  "woman-bowl-cut",
  "woman-bowtie",
  "woman-curly-updo",
  "woman-dark-blazer",
  "woman-dark-lob",
  "woman-heart-top",
  "woman-shaved-head",
];

const AVATAR_OPTIONS = AVATAR_NAMES.map((name) => ({
  value: name,
  label: name.replaceAll("-", " "),
  src: `/images/avatars/${name}.svg`,
}));

const formatAvatarOption = ({ src, label }) => (
  <span className="c-avatar-option">
    <img alt={label} className="c-avatar-option__img" src={src} />
    <span className="c-avatar-option__label">{label}</span>
  </span>
);

/**
 * Component: Profile
 * User profile page for editing personal details, avatar, and language preference.
 * @component
 * @returns {JSX.Element}
 */
const Profile = () => {
  // Hooks
  const { t, i18n } = useTranslation();
  const { setUser } = useAuth();
  const { setHeader } = useMain();
  const { addToast } = useToast();
  const location = useLocation();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm();

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["profile"],
    queryFn: ({ signal }) => get("/api/profile", { signal }),
  });

  // Mutations
  const saveProfile = useMutation({
    mutationFn: (values) =>
      put("/api/profile", {
        name: values.name,
        email: values.email,
        avatar: values.avatar,
        locale: values.language,
      }),
    onSuccess: ({ data }, values) => {
      setUser((previous) => ({ ...previous, ...data.user }));

      if (values.language !== i18n.language) {
        i18n.changeLanguage(values.language);
        localStorage.setItem("vallle_language", values.language);
      }

      addToast(t("features.profile.success"), "success");
    },
    onError: (error) => {
      setServerError(
        error.code === "EMAIL_TAKEN"
          ? t("features.profile.error.emailTaken")
          : t("features.profile.error.generic"),
      );
    },
  });

  // State
  const [serverError, setServerError] = useState("");

  // Handlers
  const handleSave = useCallback(
    (values) => {
      setServerError("");
      saveProfile.mutate(values);
    },
    [saveProfile],
  );

  // Effects
  useEffect(() => {
    setHeader({
      title: t("features.profile.heading"),
      description: t("features.profile.description"),
      image: "profile",
    });
    return () => setHeader({ title: "" });
  }, [setHeader, t]);

  useEffect(() => {
    if (response?.data) {
      reset({
        name: response.data.user.name,
        email: response.data.user.email,
        language: response.data.user.locale || i18n.language,
        avatar: response.data.user.avatar || "paper-bag-head",
      });
    }
  }, [response, reset, i18n.language]);

  // Render
  if (isPending) {
    return (
      <div className="p-profile">
        <div className="p-profile__loading">
          <Loader />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-profile">
        <div className="p-profile__error">
          <EmptyState
            description={t("common.error")}
            hideImageOnMobile
            image="profile--error"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-profile">
      <Form
        className="p-profile__form"
        error={serverError}
        handleSubmit={handleSubmit}
        onSubmit={handleSave}
      >
        <FormFields>
          <Select
            control={control}
            error={errors.avatar}
            formatOptionLabel={formatAvatarOption}
            isSearchable
            label={t("features.profile.form.avatar")}
            name="avatar"
            options={AVATAR_OPTIONS}
          />
          <Input
            autoComplete="name"
            error={errors.name}
            label={t("features.profile.form.name")}
            name="name"
            register={register}
            required={t("features.profile.form.error.nameRequired")}
          />
          <Input
            autoComplete="email"
            error={errors.email}
            label={t("features.profile.form.email")}
            name="email"
            register={register}
            required={t("features.profile.form.error.emailRequired")}
            type="email"
          />
          <Select
            control={control}
            error={errors.language}
            label={t("features.profile.form.language")}
            name="language"
            options={LOCALE_OPTIONS}
          />

          <Fieldset legend={t("features.profile.password.heading")}>
            <p className="c-form__fieldset-description">
              {t("features.profile.password.description")}
            </p>
            <Button
              skin="sand"
              state={{ backgroundLocation: location }}
              to={ROUTES.PROFILE_MODAL_CHANGE_PASSWORD}
            >
              {t("features.profile.password.submit")}
            </Button>
          </Fieldset>
        </FormFields>

        <FormActions>
          <Button
            display="block"
            isProcessing={saveProfile.isPending}
            type="submit"
          >
            {t("common.save")}
          </Button>
        </FormActions>
      </Form>
    </div>
  );
};

export default Profile;
