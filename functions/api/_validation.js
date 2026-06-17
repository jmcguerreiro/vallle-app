/**
 * Shared, stateless input validators used across API handlers. These check the
 * shape of user-supplied values only — no authentication or database concerns.
 */

/**
 * Validates an email address against a basic shape check (something@something.tld).
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  return (
    typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  );
}

/**
 * Allowed avatar names. Mirrors `AVATAR_NAMES` in `src/features/profile/Profile.jsx`
 * — keep the two in sync. The name is interpolated into an image path
 * (`/images/avatars/<name>.svg`), so an allowlist prevents an arbitrary string
 * (path traversal, unexpected markup) from being persisted.
 */
const VALID_AVATARS = new Set([
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
]);

/** Default avatar used when none is supplied. */
export const DEFAULT_AVATAR = "paper-bag-head";

/**
 * Returns true if `avatar` is one of the known avatar names.
 * @param {unknown} avatar
 * @returns {boolean}
 */
export function isValidAvatar(avatar) {
  return typeof avatar === "string" && VALID_AVATARS.has(avatar);
}

/**
 * Validates a password against the strength policy (min 8 chars, upper, lower,
 * digit, special). Mirrors the frontend rule in `src/utils/password.js` — keep
 * the two in sync. Single source of truth for every server-side password check.
 * @param {string} password
 * @returns {boolean}
 */
export function isStrongPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)
  );
}
