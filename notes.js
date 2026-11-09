(() => {
  "use strict";

  const { $, $$, pad, escapeHTML, noteWords, formatDateShort, formatChineseDate, showToast, lockBody, unlockBody, prefersReducedMotion } = window.Luyu;
  const CUSTOM_KEY = "luyu-custom-notes-v2";
  const FAVORITES_KEY = "luyu-favorites-v2";
  const seedNotes = window.LUYU_NOTES || [];

  let customNotes = readStorage(CUSTOM_KEY, []);
  let favorites = new Set(readStorage(FAVORITES_KEY, []));
  let allNotes = [];
  let activeCategory = "全部";
  let searchTerm = "";
  let currentNoteId = null;
  let lastFocusedElement = null;

  const categoryInfo = {
    "四时": { tone: "rain", character: "时", caption: "四时流转" },
    "日常": { tone: "night", character: "常", caption: "人间烟火" },
    "行旅": { tone: "sun", character: "游", caption: "山水一程" },
    "心事": { tone: "mist", character: "念", caption: "心中微澜" }
  };

  const scenes = [
    {
      sun: [470, 92, 27],
      far: "M-40 250C80 190 150 170 230 190c90 22 125 78 227 55 92-21 134-76 220-53v158H-40Z",
      mid: "M-30 310c88-41 139-107 225-103 77 4 115 77 202 76 91-1 139-71 226-28v127H-30Z",
      near: "M-20 366c83-26 129-88 206-112 52-17 104 1 145 35 48 39 105 37 165 10 48-21 81-18 124 2v89H-20Z"
    },
    {
      sun: [132, 86, 23],
      far: "M-30 232c75-13 136-92 220-88 73 4 114 61 183 68 88 9 132-63 227-48v166H-30Z",
      mid: "M-30 317c82-17 126-86 210-102 68-13 109 26 159 52 55 29 120 21 170-9 42-25 74-17 111 4v99H-30Z",
      near: "M-20 370c87-14 130-68 204-88 63-17 118 8 157 35 43 30 94 25 142 5 54-23 92-16 137 10v54H-20Z"
    },
    {
      sun: [478, 112, 24],
      far: "M-40 242c89-5 145-78 232-78 65 0 111 58 180 58 79 0 131-63 210-43v143H-40Z",
      mid: "M-30 316c90-9 145-69 214-91 62-20 113 6 161 39 44 30 91 26 144 1 49-23 85-15 125 8v90H-30Z",
      near: "M-20 370c77-22 124-60 190-82 56-18 110-1 148 27 40 30 86 28 132 8 54-23 94-17 143 7v55H-20Z"
    }
  ];

  const els = {
    grid: $("#notes-grid"),
    empty: $("#notes-empty"),
    total: $("#notes-total"),
    search: $("#notes-search"),
    reader: $("#reader"),
    readerScroll: $("#reader-scroll"),
    readerTitle: $("#reader-title"),
    readerMeta: $("#reader-meta"),
    readerLead: $("#reader-lead"),
    readerBody: $("#reader-body"),
    readerDate: $("#reader-date"),
    readerIndex: $("#reader-index"),
    readerProgress: $("#reader-progress-bar"),
    favoriteButton: $("#favorite-button"),
    deleteButton: $("#delete-button"),
    editor: $("#editor-dialog"),
    editorForm: $("#editor-form"),
    noteTitle: $("#note-title"),
    noteCategory: $("#note-category"),
    noteContent: $("#note-content"),
    wordCount: $("#editor-word-count")
  };

  function readStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      showToast("浏览器未能保存");
      return false;
    }
  }

  function sceneMarkup(index) {
    const scene = scenes[index % scenes.length];
    return `<svg class="card-scene" viewBox="0 0 600 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <circle class="scene-sun" cx="${scene.sun[0]}" cy="${scene.sun[1]}" r="${scene.sun[2]}"></circle>
      <path class="scene-far" d="${scene.far}"></path><path class="scene-mid" d="${scene.mid}"></path><path class="scene-near" d="${scene.near}"></path>
      <path class="scene-birds" d="M178 92c7-6 13-6 19 0 6-6 12-6 18 0M229 70c5-4 9-4 14 0 5-4 9-4 14 0"></path>
    </svg>`;
  }

  function getVisibleNotes() {
    const term = searchTerm.toLowerCase();
    return allNotes
      .filter((note) => activeCategory === "全部" || note.category === activeCategory)
      .filter((note) => !term || [note.title, note.category, note.excerpt, note.content].join(" ").toLowerCase().includes(term))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  function createCard(note, index, total) {
    const info = categoryInfo[note.category] || categoryInfo["日常"];
    const tone = note.tone || info.tone;
    const favorite = favorites.has(note.id);
    const card = document.createElement("article");
    card.className = "note-card";
    if (index === 0) card.classList.add("featured");
    if ((index === 1 || index === 2) && total > 2) card.classList.add("side");
    card.style.transitionDelay = `${Math.min(index * 65, 260)}ms`;
    card.innerHTML = `
      <button class="card-open" type="button" data-open-id="${escapeHTML(note.id)}" aria-label="阅读《${escapeHTML(note.title)}》">
        <div class="card-visual tone-${escapeHTML(tone)}">${sceneMarkup(index)}
          <span class="visual-date">${formatDateShort(note.date)}</span>
          <span class="visual-character">${escapeHTML(note.character || info.character)}</span>
          <span class="visual-caption">${escapeHTML(note.caption || info.caption)}</span>
        </div>
        <div class="card-content">
          <div class="card-meta"><span class="card-category">${escapeHTML(note.category)}</span><i></i><span>${escapeHTML(formatChineseDate(note.date))}</span></div>
          <h3>${escapeHTML(note.title)}</h3>
          <p class="card-excerpt">${escapeHTML(note.excerpt || note.content.slice(0, 72))}</p>
          <div class="card-bottom"><span class="card-read">阅读全文</span><span>${noteWords(note)} 字${favorite ? ' · <span class="card-favorite">藏</span>' : ""}</span></div>
        </div>
      </button>`;
    return card;
  }

  function renderNotes() {
    const list = getVisibleNotes();
    els.grid.innerHTML = "";
    els.empty.classList.toggle("is-visible", list.length === 0);
    els.total.textContent = pad(allNotes.length);
    list.forEach((note, index) => {
      const card = createCard(note, index, list.length);
      els.grid.appendChild(card);
      requestAnimationFrame(() => card.classList.add("is-visible"));
    });
  }

  function openReader(id, trigger) {
    const note = allNotes.find((item) => item.id === id);
    if (!note) return;
    currentNoteId = id;
    lastFocusedElement = trigger || document.activeElement;
    els.readerTitle.textContent = note.title;
    els.readerLead.textContent = note.lead || note.excerpt || "";
    els.readerMeta.innerHTML = "";
    [note.category, formatChineseDate(note.date), `${noteWords(note)} 字`].forEach((text) => {
      const span = document.createElement("span");
      span.textContent = text;
      els.readerMeta.appendChild(span);
    });
    els.readerBody.innerHTML = "";
    String(note.content).split(/\n\s*\n/).forEach((paragraph) => {
      const text = paragraph.trim();
      if (!text) return;
      const element = document.createElement(text.startsWith(">") ? "blockquote" : "p");
      element.textContent = text.replace(/^>\s?/, "");
      els.readerBody.appendChild(element);
    });
    els.readerDate.textContent = formatChineseDate(note.date);
    els.readerIndex.textContent = pad(allNotes.findIndex((item) => item.id === id) + 1);
    els.deleteButton.hidden = !note.custom;
    updateFavoriteButton();
    els.readerProgress.style.height = "0%";
    els.reader.hidden = false;
    lockBody();
    requestAnimationFrame(() => {
      els.reader.classList.add("is-open");
      els.readerScroll.scrollTop = 0;
      window.setTimeout(() => $(".reader-close").focus({ preventScroll: true }), 120);
    });
  }

  function closeReader() {
    if (els.reader.hidden) return;
    els.reader.classList.remove("is-open");
    window.setTimeout(() => {
      if (!els.reader.classList.contains("is-open")) {
        els.reader.hidden = true;
        unlockBody();
        lastFocusedElement?.focus?.({ preventScroll: true });
      }
    }, prefersReducedMotion ? 0 : 520);
  }

  function updateFavoriteButton() {
    const active = favorites.has(currentNoteId);
    els.favoriteButton.classList.toggle("is-favorite", active);
    els.favoriteButton.querySelector("span").textContent = active ? "已收藏" : "收藏";
  }

  function toggleFavorite() {
    if (!currentNoteId) return;
    if (favorites.has(currentNoteId)) favorites.delete(currentNoteId);
    else favorites.add(currentNoteId);
    writeStorage(FAVORITES_KEY, [...favorites]);
    updateFavoriteButton();
    renderNotes();
    showToast(favorites.has(currentNoteId) ? "已收藏这一页" : "已从收藏中取出");
  }

  function deleteCurrentNote() {
    const note = allNotes.find((item) => item.id === currentNoteId);
    if (!note?.custom || !window.confirm(`确定删除《${note.title}》吗？`)) return;
    customNotes = customNotes.filter((item) => item.id !== note.id);
    allNotes = allNotes.filter((item) => item.id !== note.id);
    favorites.delete(note.id);
    writeStorage(CUSTOM_KEY, customNotes);
    writeStorage(FAVORITES_KEY, [...favorites]);
    closeReader();
    renderNotes();
    showToast("这篇随笔已删除");
  }

  function openEditor(trigger) {
    lastFocusedElement = trigger || document.activeElement;
    els.editorForm.reset();
    els.wordCount.textContent = "0";
    els.editor.hidden = false;
    lockBody();
    requestAnimationFrame(() => {
      els.editor.classList.add("is-open");
      window.setTimeout(() => els.noteTitle.focus({ preventScroll: true }), 120);
    });
  }

  function closeEditor() {
    if (els.editor.hidden) return;
    els.editor.classList.remove("is-open");
    window.setTimeout(() => {
      if (!els.editor.classList.contains("is-open")) {
        els.editor.hidden = true;
        unlockBody();
        lastFocusedElement?.focus?.({ preventScroll: true });
      }
    }, prefersReducedMotion ? 0 : 350);
  }

  function saveNote(event) {
    event.preventDefault();
    const title = els.noteTitle.value.trim();
    const content = els.noteContent.value.trim();
    if (!title || !content) return;
    const now = new Date();
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const category = els.noteCategory.value;
    const info = categoryInfo[category] || categoryInfo["日常"];
    const note = {
      id: `custom-${Date.now()}`,
      title,
      category,
      date,
      tone: info.tone,
      character: title.slice(0, 1),
      caption: info.caption,
      excerpt: content.replace(/^>\s?/gm, "").replace(/\s+/g, " ").slice(0, 76),
      lead: content.replace(/^>\s?/gm, "").replace(/\s+/g, " ").slice(0, 48),
      content,
      custom: true
    };
    customNotes.unshift(note);
    allNotes.unshift(note);
    if (!writeStorage(CUSTOM_KEY, customNotes)) return;
    activeCategory = "全部";
    searchTerm = "";
    els.search.value = "";
    $$(".filter").forEach((button) => {
      const active = button.dataset.category === "全部";
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    closeEditor();
    renderNotes();
    showToast("已收入集中");
  }

  els.grid.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-open-id]");
    if (trigger) openReader(trigger.dataset.openId, trigger);
  });

  $$(".filter").forEach((button) => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      $$(".filter").forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", String(active));
      });
      renderNotes();
    });
  });

  els.search.addEventListener("input", () => {
    searchTerm = els.search.value.trim();
    renderNotes();
  });

  $$(".write-trigger").forEach((button) => button.addEventListener("click", () => openEditor(button)));
  $$("[data-close-reader]").forEach((button) => button.addEventListener("click", closeReader));
  $$("[data-close-editor]").forEach((button) => button.addEventListener("click", closeEditor));
  els.favoriteButton.addEventListener("click", toggleFavorite);
  els.deleteButton.addEventListener("click", deleteCurrentNote);
  els.editorForm.addEventListener("submit", saveNote);
  els.noteContent.addEventListener("input", () => {
    els.wordCount.textContent = noteWords({ content: els.noteContent.value }).toLocaleString("zh-CN");
  });
  els.readerScroll.addEventListener("scroll", () => {
    const max = els.readerScroll.scrollHeight - els.readerScroll.clientHeight;
    els.readerProgress.style.height = `${max > 0 ? Math.min(100, els.readerScroll.scrollTop / max * 100) : 0}%`;
  }, { passive: true });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!els.reader.hidden) closeReader();
      else if (!els.editor.hidden) closeEditor();
    }
  });

  customNotes = Array.isArray(customNotes) ? customNotes.filter((note) => note?.id && note?.title && note?.content) : [];
  allNotes = [...seedNotes, ...customNotes];
  renderNotes();
})();
