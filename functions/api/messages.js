const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

async function hashIp(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const userAgent = request.headers.get("User-Agent") || "";
  const salt = env.RATE_LIMIT_SALT || "deerfish-guestbook";
  const bytes = new TextEncoder().encode(`${salt}:${ip}:${userAgent}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyTurnstile(request, env, token) {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;

  const formData = new FormData();
  formData.append("secret", env.TURNSTILE_SECRET_KEY);
  formData.append("response", token);
  formData.append("remoteip", request.headers.get("CF-Connecting-IP") || "");

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData
    });
    const result = await response.json();
    return Boolean(result.success);
  } catch (error) {
    return false;
  }
}

async function notifyByEmail(env, message) {
  if (!env.RESEND_API_KEY || !env.NOTIFY_EMAIL) return;

  const emailLine = message.email
    ? `<p><strong>回信邮箱：</strong>${escapeHtml(message.email)}</p>`
    : "<p><strong>回信邮箱：</strong>未填写</p>";

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: env.NOTIFY_FROM || "鹿鱼集 <onboarding@resend.dev>",
        to: [env.NOTIFY_EMAIL],
        subject: `鹿鱼集新留言 · ${message.name}`,
        html: `
          <div style="font-family:serif;color:#272721;line-height:1.9">
            <h2 style="font-weight:500">有人给你留了一句话</h2>
            <p><strong>称呼：</strong>${escapeHtml(message.name)}</p>
            ${emailLine}
            <blockquote style="margin:20px 0;padding:12px 18px;border-left:2px solid #a34636;background:#f6f2e9">
              ${escapeHtml(message.message).replace(/\n/g, "<br>")}
            </blockquote>
            <p style="color:#89877b;font-size:12px">鹿鱼集 · 公开留言板</p>
          </div>`
      })
    });
  } catch (error) {
    // 保存留言优先；邮件通知失败不应导致访客提交失败。
  }
}

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const result = await env.DB.prepare(`
      SELECT id, name, message, created_at
      FROM messages
      WHERE is_visible = 1
      ORDER BY id DESC
      LIMIT 30
    `).all();
    return json({ ok: true, messages: result.results || [] });
  } catch (error) {
    return json({ error: "留言暂时没有加载出来" }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return json({ error: "提交内容格式不正确" }, 400);
  }

  // 隐藏字段只用于拦截自动机器人，正常访客不会填写。
  if (String(body.website || "").trim()) {
    return json({ ok: true, message: null }, 200);
  }

  const name = String(body.name || "").trim().replace(/\s+/g, " ");
  const email = String(body.email || "").trim();
  const message = String(body.message || "").trim();
  const turnstileToken = String(body.turnstileToken || "");

  if (name.length < 1 || name.length > 30) {
    return json({ error: "称呼需要 1 到 30 个字" }, 400);
  }
  if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120)) {
    return json({ error: "邮箱格式不正确" }, 400);
  }
  if (message.length < 2 || message.length > 500) {
    return json({ error: "留言需要 2 到 500 个字" }, 400);
  }

  const turnstileOk = await verifyTurnstile(request, env, turnstileToken);
  if (!turnstileOk) {
    return json({ error: "人机验证没有通过，请重试" }, 400);
  }

  const ipHash = await hashIp(request, env);

  try {
    const recent = await env.DB.prepare(`
      SELECT COUNT(*) AS count
      FROM messages
      WHERE ip_hash = ?
        AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 minutes')
    `).bind(ipHash).first();

    if (Number(recent?.count || 0) >= 3) {
      return json({ error: "留言太频繁了，请过几分钟再来" }, 429);
    }

    const result = await env.DB.prepare(`
      INSERT INTO messages (name, email, message, ip_hash)
      VALUES (?, ?, ?, ?)
    `).bind(name, email || null, message, ipHash).run();

    const inserted = await env.DB.prepare(`
      SELECT id, name, message, created_at
      FROM messages
      WHERE id = ?
    `).bind(result.meta.last_row_id).first();

    if (inserted) {
      await notifyByEmail(env, { name, email, message });
    }

    return json({ ok: true, message: inserted }, 201);
  } catch (error) {
    return json({ error: "留言没有保存成功，请稍后再试" }, 500);
  }
}
