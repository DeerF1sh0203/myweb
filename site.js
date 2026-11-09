(() => {
  "use strict";

  const config = window.LUYU_CONFIG || {
    email: "your-email@example.com",
    location: "于日常",
    guestbookApi: "/api/messages",
    turnstileSiteKey: ""
  };

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let toastTimer = null;

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);
  }

  function noteWords(note) {
    return String(note?.content || "").replace(/\s/g, "").length;
  }

  function formatDateShort(dateString) {
    const parts = String(dateString).split("-");
    return `${parts[1] || "01"}.${parts[2] || "01"}`;
  }

  function formatChineseDate(dateString) {
    const parts = String(dateString).split("-");
    return `${parts[0] || "2026"}年${Number(parts[1] || 1)}月${Number(parts[2] || 1)}日`;
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  function lockBody() {
    document.body.classList.add("is-locked");
  }

  function unlockBody() {
    document.body.classList.remove("is-locked");
  }

  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const helper = document.createElement("textarea");
    helper.value = value;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
  }

  function hydrateSiteConfig() {
    $$("[data-email]").forEach((element) => {
      element.textContent = config.email;
    });
    $$("[data-email-link]").forEach((link) => {
      link.href = `mailto:${config.email}`;
    });
    $$("[data-location]").forEach((element) => {
      element.textContent = config.location;
    });
    $$("[data-copy-email]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await copyText(config.email);
          showToast("邮箱已复制");
        } catch (error) {
          showToast(`邮箱：${config.email}`);
        }
      });
    });
  }

  function initNavigation() {
    const menuToggle = $(".menu-toggle");
    const mainNav = $(".main-nav");
    if (!menuToggle || !mainNav) return;

    const close = () => {
      mainNav.classList.remove("is-open");
      menuToggle.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    };

    menuToggle.addEventListener("click", () => {
      const open = mainNav.classList.toggle("is-open");
      menuToggle.classList.toggle("is-open", open);
      menuToggle.setAttribute("aria-expanded", String(open));
    });

    $$("a", mainNav).forEach((link) => link.addEventListener("click", close));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && mainNav.classList.contains("is-open")) close();
    });
  }

  function initCursor() {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const cursor = $(".ink-cursor");
    if (!cursor) return;
    let frame = null;
    window.addEventListener("pointermove", (event) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        cursor.style.setProperty("--cursor-x", `${event.clientX}px`);
        cursor.style.setProperty("--cursor-y", `${event.clientY}px`);
        cursor.classList.add("is-visible");
        frame = null;
      });
    }, { passive: true });
    document.addEventListener("mouseover", (event) => {
      cursor.classList.toggle("is-hovering", Boolean(event.target.closest("a, button, input, textarea, select")));
    });
    document.documentElement.addEventListener("mouseleave", () => cursor.classList.remove("is-visible"));
  }

  function initDate() {
    const day = $("#hub-day");
    const month = $("#hub-month");
    const year = $("#hub-year");
    if (!day || !month || !year) return;
    const now = new Date();
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    day.textContent = pad(now.getDate());
    month.textContent = months[now.getMonth()];
    year.textContent = now.getFullYear();
  }

  hydrateSiteConfig();
  initNavigation();
  initCursor();
  initDate();

  window.Luyu = {
    config,
    $,
    $$,
    pad,
    escapeHTML,
    noteWords,
    formatDateShort,
    formatChineseDate,
    showToast,
    lockBody,
    unlockBody,
    copyText,
    prefersReducedMotion
  };
})();
