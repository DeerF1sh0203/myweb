(() => {
  "use strict";

  const { config, $, pad, showToast } = window.Luyu;
  const form = $("#guestbook-form");
  const list = $("#message-list");
  const count = $("#guestbook-count");
  const submit = $("#guestbook-submit");
  const refresh = $("#guestbook-refresh");
  const characterCount = $("#guestbook-character-count");
  const turnstileContainer = $("#turnstile-container");
  let messages = [];
  let turnstileWidgetId = null;

  function setupTurnstile() {
    if (!config.turnstileSiteKey || !turnstileContainer) return;
    const renderWidget = () => {
      if (!window.turnstile || turnstileWidgetId !== null) return;
      turnstileWidgetId = window.turnstile.render(turnstileContainer, {
        sitekey: config.turnstileSiteKey,
        theme: "light",
        size: "flexible"
      });
    };
    if (window.turnstile) {
      renderWidget();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = renderWidget;
    document.head.appendChild(script);
  }

  function turnstileToken() {
    if (!config.turnstileSiteKey || !window.turnstile || turnstileWidgetId === null) return "";
    return window.turnstile.getResponse(turnstileWidgetId) || "";
  }

  function formatTime(value) {
    const raw = String(value || "");
    const normalized = /(?:Z|[+-]\d{2}:\d{2})$/.test(raw) ? raw : raw.replace(" ", "T") + "Z";
    const time = new Date(normalized).getTime();
    if (Number.isNaN(time)) return raw;
    const diff = Date.now() - time;
    if (diff >= 0 && diff < 60000) return "刚刚";
    if (diff >= 0 && diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff >= 0 && diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    const date = new Date(time);
    return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
  }

  function renderItems(items) {
    messages = Array.isArray(items) ? items : [];
    count.textContent = pad(messages.length);
    list.innerHTML = "";
    if (!messages.length) {
      const empty = document.createElement("div");
      empty.className = "message-empty";
      const mark = document.createElement("span");
      mark.className = "message-empty-mark";
      mark.textContent = "空";
      const copy = document.createElement("p");
      copy.textContent = "展览板上还没有便笺，来写下第一句话吧。";
      empty.append(mark, copy);
      list.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    messages.forEach((message, index) => {
      const item = document.createElement("article");
      item.className = "message-item";
      item.style.animationDelay = `${Math.min(index * 45, 270)}ms`;

      const avatar = document.createElement("span");
      avatar.className = "message-avatar";
      avatar.textContent = String(message.name || "客").trim().slice(0, 1) || "客";

      const content = document.createElement("div");
      content.className = "message-content";
      const meta = document.createElement("div");
      meta.className = "message-meta";
      const name = document.createElement("strong");
      name.textContent = message.name || "匿名来客";
      const time = document.createElement("time");
      time.textContent = formatTime(message.created_at);
      meta.append(name, time);

      const body = document.createElement("p");
      body.className = "message-body";
      body.textContent = message.message || "";
      content.append(meta, body);
      item.append(avatar, content);
      fragment.appendChild(item);
    });
    list.appendChild(fragment);
  }

  function loading() {
    list.innerHTML = '<div class="message-loading"><span></span><p>正在翻看留言……</p></div>';
    count.textContent = "··";
  }

  function showError(text) {
    list.innerHTML = "";
    const error = document.createElement("div");
    error.className = "message-error";
    const copy = document.createElement("p");
    copy.textContent = text;
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "再试一次";
    retry.addEventListener("click", load);
    error.append(copy, retry);
    list.appendChild(error);
    count.textContent = "00";
  }

  async function load() {
    loading();
    refresh.classList.add("is-loading");
    try {
      const response = await fetch(config.guestbookApi, { headers: { Accept: "application/json" }, cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "留言没有加载出来");
      renderItems(payload.messages || []);
    } catch (error) {
      showError("留言板还没有连接好。部署到 Cloudflare Pages 后即可使用。");
    } finally {
      refresh.classList.remove("is-loading");
    }
  }

  async function submitMessage(event) {
    event.preventDefault();
    if (submit.disabled) return;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();
    const website = String(data.get("website") || "").trim();

    if (!name || !message) {
      showToast("请先写下称呼和留言");
      return;
    }
    if (config.turnstileSiteKey && !turnstileToken()) {
      showToast("请先完成人机验证");
      return;
    }

    const original = submit.innerHTML;
    submit.disabled = true;
    submit.innerHTML = "正在钉上 <span>…</span>";
    try {
      const response = await fetch(config.guestbookApi, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, email, message, website, turnstileToken: turnstileToken() })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "留言没有发送成功");
      if (payload.message) renderItems([payload.message, ...messages]);
      else await load();
      form.reset();
      characterCount.textContent = "0";
      if (turnstileWidgetId !== null && window.turnstile) window.turnstile.reset(turnstileWidgetId);
      showToast("留言已经钉在展览板上");
    } catch (error) {
      showToast(error.message || "留言没有发送成功，请稍后再试");
    } finally {
      submit.disabled = false;
      submit.innerHTML = original;
    }
  }

  form.addEventListener("submit", submitMessage);
  refresh.addEventListener("click", load);
  $("#guest-message").addEventListener("input", (event) => {
    characterCount.textContent = String(event.target.value.length);
  });

  setupTurnstile();
  load();
})();
