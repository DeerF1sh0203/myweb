(() => {
  "use strict";

  const TOKEN_KEY = "luyu-admin-token";
  const API_URL = "/api/admin/messages";
  const loginPanel = document.querySelector("#login-panel");
  const dashboard = document.querySelector("#dashboard");
  const loginForm = document.querySelector("#login-form");
  const tokenInput = document.querySelector("#admin-token");
  const loginError = document.querySelector("#login-error");
  const messageList = document.querySelector("#admin-message-list");
  const count = document.querySelector("#admin-count");
  const toast = document.querySelector("#admin-toast");
  let token = sessionStorage.getItem(TOKEN_KEY) || "";
  let toastTimer = null;

  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
  }

  function showLogin(message = "") {
    dashboard.hidden = true;
    loginPanel.hidden = false;
    loginError.textContent = message;
    if (message) tokenInput.focus();
  }

  function showDashboard() {
    loginPanel.hidden = true;
    dashboard.hidden = false;
    loginError.textContent = "";
  }

  async function request(method = "GET", body) {
    const response = await fetch(API_URL, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    if (response.status === 401) throw new Error("unauthorized");
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "操作没有成功");
    return payload;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("zh-CN", { hour12: false });
  }

  function messageElement(message) {
    const article = document.createElement("article");
    article.className = "admin-message";
    if (!message.is_visible) article.classList.add("is-hidden");

    const head = document.createElement("div");
    head.className = "admin-message-head";
    const identity = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = message.name;
    const time = document.createElement("time");
    time.textContent = `${formatDate(message.created_at)} · ${message.is_visible ? "公开中" : "已隐藏"}`;
    identity.append(name, time);

    const email = document.createElement("span");
    email.className = "admin-email";
    email.textContent = message.email ? `回信：${message.email}` : "未填写邮箱";
    head.append(identity, email);

    const body = document.createElement("p");
    body.className = "admin-message-body";
    body.textContent = message.message;

    const actions = document.createElement("div");
    actions.className = "admin-message-actions";
    const visibilityButton = document.createElement("button");
    visibilityButton.type = "button";
    visibilityButton.textContent = message.is_visible ? "隐藏留言" : "重新公开";
    visibilityButton.addEventListener("click", () => updateVisibility(message));
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "删除";
    deleteButton.addEventListener("click", () => deleteMessage(message));
    actions.append(visibilityButton, deleteButton);

    article.append(head, body, actions);
    return article;
  }

  function renderMessages(messages) {
    messageList.innerHTML = "";
    count.textContent = String(messages.length);
    if (!messages.length) {
      const empty = document.createElement("div");
      empty.className = "admin-empty";
      empty.textContent = "还没有留言。";
      messageList.appendChild(empty);
      return;
    }
    messages.forEach((message) => messageList.appendChild(messageElement(message)));
  }

  async function loadMessages() {
    try {
      const payload = await request();
      showDashboard();
      renderMessages(payload.messages || []);
    } catch (error) {
      if (error.message === "unauthorized") {
        sessionStorage.removeItem(TOKEN_KEY);
        token = "";
        showLogin("管理口令不正确，请重新输入。");
      } else {
        showToast(error.message || "留言没有加载出来");
      }
    }
  }

  async function updateVisibility(message) {
    try {
      await request("PATCH", { id: message.id, visible: !message.is_visible });
      showToast(message.is_visible ? "留言已隐藏" : "留言已重新公开");
      await loadMessages();
    } catch (error) {
      showToast(error.message || "留言状态没有更新");
    }
  }

  async function deleteMessage(message) {
    if (!window.confirm(`确定删除「${message.name}」的留言吗？`)) return;
    try {
      await request("DELETE", { id: message.id });
      showToast("留言已删除");
      await loadMessages();
    } catch (error) {
      showToast(error.message || "留言没有删除成功");
    }
  }

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    token = tokenInput.value.trim();
    if (!token) return;
    sessionStorage.setItem(TOKEN_KEY, token);
    loadMessages();
  });

  document.querySelector("#refresh-button").addEventListener("click", loadMessages);
  document.querySelector("#logout-button").addEventListener("click", () => {
    sessionStorage.removeItem(TOKEN_KEY);
    token = "";
    tokenInput.value = "";
    showLogin();
  });

  if (token) {
    loadMessages();
  } else {
    showLogin();
  }
})();
