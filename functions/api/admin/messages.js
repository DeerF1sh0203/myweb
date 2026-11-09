const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function isAuthorized(request, env) {
  if (!env.ADMIN_TOKEN) return false;
  const header = request.headers.get("Authorization") || "";
  return header === `Bearer ${env.ADMIN_TOKEN}`;
}

function unauthorized() {
  return json({ error: "管理口令不正确" }, 401);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) return unauthorized();

  try {
    const result = await env.DB.prepare(`
      SELECT id, name, email, message, created_at, is_visible
      FROM messages
      ORDER BY id DESC
      LIMIT 100
    `).all();
    return json({ ok: true, messages: result.results || [] });
  } catch (error) {
    return json({ error: "留言没有加载出来" }, 500);
  }
}

export async function onRequestPatch(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return json({ error: "请求格式不正确" }, 400);
  }

  const id = Number(body.id);
  const visible = body.visible ? 1 : 0;
  if (!Number.isInteger(id) || id < 1) {
    return json({ error: "留言编号不正确" }, 400);
  }

  try {
    await env.DB.prepare("UPDATE messages SET is_visible = ? WHERE id = ?").bind(visible, id).run();
    return json({ ok: true });
  } catch (error) {
    return json({ error: "留言状态没有更新" }, 500);
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return json({ error: "请求格式不正确" }, 400);
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id < 1) {
    return json({ error: "留言编号不正确" }, 400);
  }

  try {
    await env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(id).run();
    return json({ ok: true });
  } catch (error) {
    return json({ error: "留言没有删除成功" }, 500);
  }
}
