/**
 * POST /api/auth/reset-password
 * Validates the reset token and updates the user's password.
 */

import { isStrongPassword } from "../_validation.js";
import { hashPassword, sha256Hex } from "./_helpers.js";

export const onRequestPost = async (context) => {
  const { env, request } = context;

  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return Response.json(
        {
          error: {
            message: "Token and password are required",
            code: "VALIDATION_FAILED",
          },
        },
        { status: 400 },
      );
    }

    if (!isStrongPassword(password)) {
      return Response.json(
        {
          error: {
            message: "Password does not meet security requirements",
            code: "WEAK_PASSWORD",
          },
        },
        { status: 400 },
      );
    }

    const tokenHash = await sha256Hex(token);
    const now = new Date().toISOString();

    // Find a valid, unused, non-expired token. Compare ISO-to-ISO: expires_at is
    // stored as a JS ISO string, so we must bind an ISO `now` rather than use
    // SQLite's datetime('now') (space separator), which sorts incorrectly against it.
    const resetToken = await env.DB.prepare(
      "SELECT id, user_id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?",
    )
      .bind(tokenHash, now)
      .first();

    if (!resetToken) {
      return Response.json(
        {
          error: {
            message: "Invalid or expired reset link",
            code: "PASSWORD_RESET_INVALID_TOKEN",
          },
        },
        { status: 400 },
      );
    }

    // Hash the new password, update user, and invalidate all tokens for this user
    const passwordHash = await hashPassword(password);

    await env.DB.batch([
      env.DB.prepare("UPDATE users SET password = ? WHERE id = ?").bind(
        passwordHash,
        resetToken.user_id,
      ),
      env.DB.prepare(
        "UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL",
      ).bind(now, resetToken.user_id),
    ]);

    return Response.json({ data: { reset: true } });
  } catch (error) {
    const err = new Error("ResetPassword: Failed to reset password");
    err.code = "PASSWORD_RESET_FAILED";
    err.cause = error;
    throw err;
  }
};
