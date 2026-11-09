(() => {
  "use strict";

  const STORAGE_KEY = "luyu-private-moments-v1";
  const staticMoments = Array.isArray(window.LUYU_MOMENTS) ? window.LUYU_MOMENTS : [];

  const momentForm = document.querySelector("#moment-form");
  const timelineList = document.querySelector("#timeline-list");
  const momentCount = document.querySelector("#moment-count");
  const dateInput = document.querySelector("#moment-date");

  let customMoments = readStorage(STORAGE_KEY, []);

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
      return false;
    }
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function todayString() {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  function formatDate(value) {
    const parts = String(value || "").split("-");
    if (parts.length !== 3) return value || "";
    return `${parts[0]}.${parts[1]}.${parts[2]}`;
  }

  function getAllMoments() {
    return [...customMoments, ...staticMoments]
      .filter((moment) => moment && moment.id && moment.title)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  function renderMoments() {
    const moments = getAllMoments();
    timelineList.innerHTML = "";
    momentCount.textContent = `${moments.length} 个时刻`;

    if (!moments.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      const strong = document.createElement("strong");
      strong.textContent = "还没有记录";
      const copy = document.createElement("p");
      copy.textContent = "从今天开始，把属于我们的日子一格一格收起来。";
      empty.append(strong, copy);
      timelineList.appendChild(empty);
      return;
    }

    moments.forEach((moment) => {
      const item = document.createElement("article");
      item.className = "moment";

      const meta = document.createElement("div");
      meta.className = "moment-meta";
      const time = document.createElement("time");
      time.textContent = formatDate(moment.date);
      const place = document.createElement("span");
      place.textContent = moment.place || "我们的某个地方";
      meta.append(time, place);

      const title = document.createElement("h3");
      title.textContent = moment.title;

      item.append(meta, title);

      if (moment.note) {
        const note = document.createElement("p");
        note.className = "moment-note";
        note.textContent = moment.note;
        item.appendChild(note);
      }

      if (moment.image) {
        const image = document.createElement("img");
        image.src = moment.image;
        image.alt = moment.title;
        image.loading = "lazy";
        item.appendChild(image);
      }

      if (customMoments.some((custom) => custom.id === moment.id)) {
        const actions = document.createElement("div");
        actions.className = "moment-actions";
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "删除";
        remove.addEventListener("click", () => deleteMoment(moment.id));
        actions.appendChild(remove);
        item.appendChild(actions);
      }

      timelineList.appendChild(item);
    });
  }

  function deleteMoment(id) {
    if (!window.confirm("确定删除这条记录吗？")) return;
    customMoments = customMoments.filter((moment) => moment.id !== id);
    if (!writeStorage(STORAGE_KEY, customMoments)) {
      window.alert("删除失败：浏览器存储空间异常");
      return;
    }
    renderMoments();
  }

  function readImageFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve("");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("图片读取失败"));
      reader.readAsDataURL(file);
    });
  }

  function resizeImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const maxSide = 1400;
        let width = image.naturalWidth;
        let height = image.naturalHeight;
        if (width > maxSide || height > maxSide) {
          const ratio = Math.min(maxSide / width, maxSide / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = () => reject(new Error("图片解析失败"));
      image.src = dataUrl;
    });
  }

  async function addMoment(event) {
    event.preventDefault();
    const formData = new FormData(momentForm);
    const title = String(formData.get("title") || "").trim();
    const date = String(formData.get("date") || "");
    const place = String(formData.get("place") || "").trim();
    const note = String(formData.get("note") || "").trim();
    const file = formData.get("image");

    if (!title || !date) {
      window.alert("请填写标题和日期");
      return;
    }

    let image = "";
    if (file && file.name) {
      try {
        const raw = await readImageFile(file);
        image = await resizeImage(raw);
      } catch (error) {
        window.alert(error.message || "照片没有处理好，请换一张试试");
        return;
      }
    }

    const moment = {
      id: `moment-${Date.now()}`,
      title,
      date,
      place,
      note,
      image,
      custom: true
    };

    customMoments.unshift(moment);
    if (!writeStorage(STORAGE_KEY, customMoments)) {
      customMoments = customMoments.filter((item) => item.id !== moment.id);
      window.alert("保存失败：这张照片可能太大了，或浏览器存储已满。");
      return;
    }

    momentForm.reset();
    dateInput.value = todayString();
    renderMoments();
  }

  momentForm.addEventListener("submit", addMoment);
  dateInput.value = todayString();
  renderMoments();
})();
