(() => {
  "use strict";

  const { $, $$, pad, escapeHTML, showToast, lockBody, unlockBody, prefersReducedMotion } = window.Luyu;
  const photos = window.LUYU_PHOTOS || [];
  const grid = $("#gallery-grid");
  const counter = $("#gallery-count");
  const viewer = $("#photo-viewer");
  const image = $("#photo-viewer-image");
  const title = $("#photo-viewer-title");
  const date = $("#photo-viewer-date");
  const note = $("#photo-viewer-note");
  const viewerCounter = $("#photo-viewer-counter");
  let currentIndex = 0;
  let lastTrigger = null;

  const observer = "IntersectionObserver" in window
    ? new IntersectionObserver((entries, instance) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            instance.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: "0px 0px -30px" })
    : null;

  function render() {
    grid.innerHTML = "";
    counter.textContent = pad(photos.length);
    photos.forEach((photo, index) => {
      const card = document.createElement("article");
      card.className = "photo-card";
      card.style.transitionDelay = `${Math.min(index * 60, 250)}ms`;
      card.innerHTML = `
        <button class="photo-open" type="button" data-photo-index="${index}" aria-label="查看照片：${escapeHTML(photo.title)}">
          <img class="photo-image" src="${escapeHTML(photo.src)}" alt="${escapeHTML(photo.alt)}" loading="${index === 0 ? "eager" : "lazy"}">
          <span class="photo-shade"></span>
          <span class="photo-number">NO. ${pad(index + 1)}</span>
          <span class="photo-copy"><time>${escapeHTML(photo.date)}</time><h3>${escapeHTML(photo.title)}</h3><p>${escapeHTML(photo.note)}</p></span>
          <span class="photo-open-arrow" aria-hidden="true">↗</span>
        </button>`;
      const imageElement = $("img", card);
      imageElement.addEventListener("error", () => {
        imageElement.hidden = true;
        $(".photo-open", card).classList.add("is-missing");
      });
      grid.appendChild(card);
      if (prefersReducedMotion) card.classList.add("is-visible");
      else if (observer) observer.observe(card);
      else requestAnimationFrame(() => card.classList.add("is-visible"));
    });
  }

  function show(index) {
    currentIndex = (index + photos.length) % photos.length;
    const photo = photos[currentIndex];
    image.classList.add("is-changing");
    window.setTimeout(() => {
      image.src = photo.src;
      image.alt = photo.alt;
      title.textContent = photo.title;
      date.textContent = photo.date;
      note.textContent = photo.note;
      viewerCounter.textContent = `${pad(currentIndex + 1)} / ${pad(photos.length)}`;
    }, prefersReducedMotion ? 0 : 80);
    image.onload = () => image.classList.remove("is-changing");
    image.onerror = () => image.classList.remove("is-changing");
  }

  function open(index, trigger) {
    lastTrigger = trigger || document.activeElement;
    show(index);
    viewer.hidden = false;
    lockBody();
    requestAnimationFrame(() => {
      viewer.classList.add("is-open");
      window.setTimeout(() => $(".photo-viewer-close").focus({ preventScroll: true }), 120);
    });
  }

  function close() {
    if (viewer.hidden) return;
    viewer.classList.remove("is-open");
    window.setTimeout(() => {
      if (!viewer.classList.contains("is-open")) {
        viewer.hidden = true;
        unlockBody();
        lastTrigger?.focus?.({ preventScroll: true });
      }
    }, prefersReducedMotion ? 0 : 420);
  }

  grid.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-photo-index]");
    if (trigger) open(Number(trigger.dataset.photoIndex), trigger);
  });
  $$("[data-close-photo]").forEach((button) => button.addEventListener("click", close));
  $("#photo-prev").addEventListener("click", () => show(currentIndex - 1));
  $("#photo-next").addEventListener("click", () => show(currentIndex + 1));
  document.addEventListener("keydown", (event) => {
    if (viewer.hidden) return;
    if (event.key === "Escape") close();
    if (event.key === "ArrowLeft") show(currentIndex - 1);
    if (event.key === "ArrowRight") show(currentIndex + 1);
  });

  render();
})();
