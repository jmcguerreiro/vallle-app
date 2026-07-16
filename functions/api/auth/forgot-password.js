/**
 * POST /api/auth/forgot-password
 * Generates a password reset token and sends a reset link via email.
 * Always returns 200 regardless of whether the email exists (prevents enumeration).
 */

import { enforceRateLimit, RATE_LIMITS } from "../_rate-limit.js";
import { generateUlid } from "../_ulid.js";
import { sendEmail } from "./_email";
import { resetPasswordEmail } from "./_email-templates.js";
import { sha256Hex } from "./_helpers.js";

const TOKEN_EXPIRY_MINUTES = 30;

/**
 * Generates a cryptographically random token and its SHA-256 hash.
 * The raw token goes in the email link; the hash is stored in the DB.
 * @returns {Promise<{ raw: string, hash: string }>}
 */
const generateResetToken = async () => {
  const buffer = crypto.getRandomValues(new Uint8Array(32));
  const raw = [...buffer].map((b) => b.toString(16).padStart(2, "0")).join("");
  return { raw, hash: await sha256Hex(raw) };
};

export const onRequestPost = async (context) => {
  const { env, request } = context;

  // Throttle per client IP to prevent reset-email flooding.
  const limited = await enforceRateLimit(
    env,
    request,
    RATE_LIMITS.FORGOT_PASSWORD,
  );
  if (limited) return limited;

  try {
    const { email } = await request.json();

    if (typeof email !== "string" || !email) {
      return Response.json(
        { error: { message: "Email is required", code: "VALIDATION_FAILED" } },
        { status: 400 },
      );
    }

    // Look up user — but always return 200 to prevent email enumeration
    const user = await env.DB.prepare(
      "SELECT id, name, email, locale FROM users WHERE email = ?",
    )
      .bind(email.toLowerCase().trim())
      .first();

    if (user) {
      const { raw, hash } = await generateResetToken();
      const expiresAt = new Date(
        Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000,
      ).toISOString();

      await env.DB.prepare(
        "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
      )
        .bind(generateUlid(), user.id, hash, expiresAt)
        .run();

      const resetUrl = `${new URL(request.url).origin}/reset-password?token=${raw}`;

      const { subject, html } = resetPasswordEmail(user.locale, {
        name: user.name,
        resetUrl,
        expiryMinutes: TOKEN_EXPIRY_MINUTES,
      });

      await sendEmail(env, { to: user.email, subject, html });
    }

    // Always return success to prevent email enumeration
    return Response.json({ data: { sent: true } });
  } catch (error) {
    const err = new Error("ForgotPassword: Failed to process reset request");
    err.code = "PASSWORD_RESET_FAILED";
    err.cause = error;
    throw err;
  }
};
