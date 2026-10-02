export interface Env {
  DB: D1Database;
  DOWNLOAD_KV: KVNamespace;
  R2_BUCKET: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/download") {
      return new Response("Not Found", { status: 404 });
    }

    const token = url.searchParams.get("token");
    const clientIP = request.headers.get("CF-Connecting-IP") || "0.0.0.0";

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), { status: 400 });
    }

    // Rate Limiting check via KV Namespace
    const kvKey = `rate:${clientIP}`;
    const currentRequests = Number((await env.DOWNLOAD_KV.get(kvKey)) || 0);
    if (currentRequests > 5) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 });
    }
    await env.DOWNLOAD_KV.put(kvKey, String(currentRequests + 1), { expirationTtl: 60 });

    // Verify token in Cloudflare D1 Database
    const tokenRecord = await env.DB.prepare(
      "SELECT id, file_key, is_used, expires_at FROM download_tokens WHERE token = ? AND is_used = 0"
    )
      .bind(token)
      .first<{ id: string; file_key: string; is_used: number; expires_at: number }>();

    if (!tokenRecord || Date.now() > tokenRecord.expires_at) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), { status: 403 });
    }

    // Mark Token used & Record Download Audit Log
    await env.DB.batch([
      env.DB.prepare("UPDATE download_tokens SET is_used = 1 WHERE id = ?").bind(tokenRecord.id),
      env.DB.prepare("INSERT INTO download_logs (id, token_id, ip_address, created_at) VALUES (?, ?, ?, ?)").bind(
        crypto.randomUUID(),
        tokenRecord.id,
        clientIP,
        Date.now()
      ),
    ]);

    // Serve binary file stream from R2 Object Storage
    const object = await env.R2_BUCKET.get(tokenRecord.file_key);
    if (!object) {
      return new Response(JSON.stringify({ error: "File object not found" }), { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Content-Disposition", `attachment; filename="${tokenRecord.file_key.split("/").pop()}"`);

    return new Response(object.body, { headers });
  },
};
