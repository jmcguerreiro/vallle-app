import { authCookie, signJwt, verifyPassword } from "./_helpers.js";

/**
 * A well-formed (`iterations:salt:hash`) PBKDF2 hash that no password matches.
 * Verified against when the email is unknown so login spends the same time
 * hashing whether or not the account exists — closes a timing side-channel that
 * would otherwise leak which emails are registered. The iteration count must
 * match the one new hashes use so the timing lines up.
 */
const DUMMY_PASSWORD_HASH =
  "600000:00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000";

/**
 * POST /api/auth/login
 * Authenticates a user with email + password, sets a JWT cookie.
 */
export async function onRequestPost(context) {
  const { env, request } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { message: "Invalid request body", code: "VALIDATION_FAILED" } },
      { status: 400 },
    );
  }

  const { email, password } = body;

  if (
    typeof email !== "string" ||
    !email ||
    typeof password !== "string" ||
    !password
  ) {
    return Response.json(
      {
        error: {
          message: "Email and password are required",
          code: "VALIDATION_FAILED",
        },
      },
      { status: 400 },
    );
  }

  try {
    const user = await env.DB.prepare(
      "SELECT id, name, email, password, role, status, avatar, locale FROM users WHERE email = ?",
    )
      .bind(email.toLowerCase().trim())
      .first();

    // Always run the password verification — against a dummy hash when the email
    // is unknown — so response timing doesn't reveal whether the account exists.
    const valid = await verifyPassword(
      password,
      user?.password ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || user.status !== "active" || !valid) {
      return Response.json(
        {
          error: {
            message: "Invalid email or password",
            code: "AUTH_INVALID_CREDENTIALS",
          },
        },
        { status: 401 },
      );
    }

    // Fetch the user's stores. role is store-scoped. Exclude inactive stores and
    // inactive memberships; suspended stores stay visible (read-only).
    const { results: storeLinks } = await env.DB.prepare(
      `SELECT su.store_id, su.role, s.name AS store_name, s.status AS store_status
       FROM store_users su
       JOIN stores s ON s.id = su.store_id
       WHERE su.user_id = ? AND s.status != 'inactive' AND su.status != 'inactive'`,
    )
      .bind(user.id)
      .all();

    const token = await signJwt(
      { sub: user.id, role: user.role },
      env.JWT_SECRET,
    );

    const secure = env.ENVIRONMENT !== "development";

    return Response.json(
      {
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar || "paper-bag-head",
            locale: user.locale || "pt",
            stores: storeLinks,
          },
        },
      },
      {
        headers: { "Set-Cookie": authCookie(token, secure) },
      },
    );
  } catch (error) {
    const err = new Error("Auth: Login failed");
    err.code = "DB_READ_FAILED";
    err.cause = error;
    throw err;
  }
}
