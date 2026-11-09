(() => {
  const notes = window.LUYU_NOTES || [];
  const photos = window.LUYU_PHOTOS || [];
  const notesCount = document.querySelector("#about-notes");
  const photosCount = document.querySelector("#about-photos");
  if (notesCount) notesCount.textContent = String(notes.length).padStart(2, "0");
  if (photosCount) photosCount.textContent = String(photos.length).padStart(2, "0");
})();
