-- Add default voucher expiry period (in days) per store.
-- Defaults to 365 days (1 year). Maximum enforced in app logic: 1825 (5 years).
ALTER TABLE stores ADD COLUMN default_voucher_expiry_days INTEGER NOT NULL DEFAULT 365;
