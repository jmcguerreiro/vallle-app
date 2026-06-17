/**
 * Locale-keyed email templates for transactional auth emails.
 * Each builder returns `{ subject, html }` ready to pass to sendEmail().
 * Portuguese copy uses the formal "você" register, per the project tone rule.
 */

import { normaliseLocale } from "../_locales.js";

/**
 * Escapes a string for safe interpolation into HTML (text and attribute
 * contexts). Names are user-controlled, so they must never be injected raw.
 * @param {string} [value]
 * @returns {string}
 */
const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

/**
 * Builds the password-reset email for the given locale.
 * @param {string} locale - The recipient's preferred locale
 * @param {Object} params
 * @param {string} params.name - Recipient's name
 * @param {string} params.resetUrl - The reset link
 * @param {number} params.expiryMinutes - Minutes until the link expires
 * @returns {{ subject: string, html: string }}
 */
export const resetPasswordEmail = (
  locale,
  { name, resetUrl, expiryMinutes },
) => {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(resetUrl);

  const templates = {
    pt: {
      subject: "Vallle — Repor palavra-passe",
      html: `
        <p>Olá ${safeName},</p>
        <p>Recebemos um pedido para repor a sua palavra-passe.</p>
        <p><a href="${safeUrl}">Clique aqui para repor a sua palavra-passe</a></p>
        <p>Este link expira em ${expiryMinutes} minutos.</p>
        <p>Se não pediu esta alteração, ignore este email.</p>
        <p>— Vallle</p>
      `,
    },
    en: {
      subject: "Vallle — Reset your password",
      html: `
        <p>Hi ${safeName},</p>
        <p>We received a request to reset your password.</p>
        <p><a href="${safeUrl}">Click here to reset your password</a></p>
        <p>This link expires in ${expiryMinutes} minutes.</p>
        <p>If you didn't request this change, you can ignore this email.</p>
        <p>— Vallle</p>
      `,
    },
  };

  return templates[normaliseLocale(locale)];
};
