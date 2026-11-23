// Emoji beranimasi (Noto Animated Emoji daripada Google Fonts).
// Jika tidak dapat dimuat, emoji biasa dipaparkan. Jika pengguna
// memilih "kurangkan animasi", versi statik digunakan.
const EMOJI_URL = "https://fonts.gstatic.com/s/e/notoemoji/latest/";
const KURANG_GERAK = matchMedia("(prefers-reduced-motion: reduce)").matches;

function emoji(kod, alt, kelas = "") {
  const fail = KURANG_GERAK ? "emoji.svg" : "512.webp";
  return `<img class="emoji ${kelas}" src="${EMOJI_URL}${kod}/${fail}" alt="${alt}" draggable="false">`;
}

// Tukar <i data-emoji="1f331" data-alt="🌱" class="..."> kepada imej beranimasi
function pasangEmoji(akar = document) {
  akar.querySelectorAll("i[data-emoji]").forEach((el) => {
    el.outerHTML = emoji(el.dataset.emoji, el.dataset.alt || "", el.className);
  });
}

document.addEventListener("error", (e) => {
  const img = e.target;
  if (img.classList?.contains("emoji")) {
    const s = document.createElement("span");
    s.className = "emoji-teks";
    s.textContent = img.alt;
    img.replaceWith(s);
  }
}, true);

document.addEventListener("DOMContentLoaded", () => pasangEmoji());
