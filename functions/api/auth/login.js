import { authCookie, signJwt, verifyPassword } from './_helpers.js'

/**
 * POST /api/auth/login
 * Authenticates a user with email + password, sets a JWT cookie.
 */
export async function onRequestPost(context) {
  const { env, request } = context

  let body
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: { message: 'Invalid request body', code: 'VALIDATION_FAILED' } },
      { status: 400 },
    )
  }

  const { email, password } = body

  if (!email || !password) {
    return Response.json(
      { error: { message: 'Email and password are required', code: 'VALIDATION_FAILED' } },
      { status: 400 },
    )
  }

  try {
    const user = await env.DB.prepare(
      'SELECT id, name, email, password, role, status FROM users WHERE email = ?',
    ).bind(email.toLowerCase().trim()).first()

    if (!user || user.status !== 'active') {
      return Response.json(
        { error: { message: 'Invalid email or password', code: 'AUTH_INVALID_CREDENTIALS' } },
        { status: 401 },
      )
    }

    const valid = await verifyPassword(password, user.password)
    if (!valid) {
      return Response.json(
        { error: { message: 'Invalid email or password', code: 'AUTH_INVALID_CREDENTIALS' } },
        { status: 401 },
      )
    }

    // Fetch the user's stores
    const { results: storeLinks } = await env.DB.prepare(
      `SELECT su.store_id, su.role, s.name AS store_name
       FROM store_users su
       JOIN stores s ON s.id = su.store_id
       WHERE su.user_id = ?`,
    ).bind(user.id).all()

    const token = await signJwt(
      { sub: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
    )

    return Response.json(
      {
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            stores: storeLinks,
          },
        },
      },
      {
        headers: { 'Set-Cookie': authCookie(token) },
      },
    )
  } catch (error) {
    const err = new Error('Auth: Login failed')
    err.code = 'DB_READ_FAILED'
    err.cause = error
    throw err
  }
}
