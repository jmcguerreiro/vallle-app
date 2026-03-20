/**
 * Returns a react-hook-form validate object for password strength rules.
 * Each rule returns true (valid) or a translated error message (invalid).
 * @param {Function} t - i18next translation function
 * @returns {Object} Validate rules for react-hook-form
 */
export const validatePassword = (t) => ({
  minLength: (value) =>
    value.length >= 8 || t('validation.password.minLength'),
  uppercase: (value) =>
    /[A-Z]/.test(value) || t('validation.password.uppercase'),
  lowercase: (value) =>
    /[a-z]/.test(value) || t('validation.password.lowercase'),
  number: (value) =>
    /\d/.test(value) || t('validation.password.number'),
  special: (value) =>
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(value) || t('validation.password.special'),
})
