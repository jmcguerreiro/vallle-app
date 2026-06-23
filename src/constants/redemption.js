/**
 * Minimum-redemption policy modes for the Vallle app.
 *
 * The minimum is advisory — surfaced in the redeem screen as a warn-and-confirm,
 * never a hard block. It lives on the store as a default
 * (`default_min_redemption_mode` / `default_min_redemption_cents`) and is
 * snapshotted onto each vallle at creation (`min_redemption_mode` /
 * `min_redemption_cents`), where it can be overridden.
 *
 * - NONE: No minimum — any partial amount redeems without a warning.
 * - FULL: The whole remaining balance should be redeemed at once; a partial
 *   redemption warns.
 * - CUSTOM: A specific euro minimum per redemption (stored in cents); redeeming
 *   below it warns. Redeeming the entire remaining balance never warns.
 */
export const MIN_REDEMPTION_MODES = {
  NONE: "none",
  FULL: "full",
  CUSTOM: "custom",
};
