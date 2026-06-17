/**
 * GET /api/vallles/lookup?code=XXX — Look up a vallle by its code.
 * @param {Object} context - Cloudflare Pages Function context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { request, env, data } = context;
  const { storeId } = data.store;

  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.trim();

  if (!code) {
    return Response.json(
      {
        error: {
          message: "Code query parameter is required",
          code: "VALIDATION_FAILED",
        },
      },
      { status: 400 },
    );
  }

  try {
    const vallle = await env.DB.prepare(
      "SELECT * FROM vallles WHERE code = ? AND store_id = ?",
    )
      .bind(code.toUpperCase(), storeId)
      .first();

    if (!vallle) {
      return Response.json(
        { error: { message: "Vallle not found", code: "VALLLE_NOT_FOUND" } },
        { status: 404 },
      );
    }

    return Response.json({ data: vallle });
  } catch (error) {
    const err = new Error("Vallles: Failed to look up vallle by code");
    err.code = "DB_READ_FAILED";
    err.cause = error;
    throw err;
  }
}
