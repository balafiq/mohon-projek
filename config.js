// ============================================================
// TETAPAN APLIKASI
// ============================================================

// Tampal URL "Web app" daripada Google Apps Script di sini
// (rujuk PANDUAN.md). Jika dibiarkan kosong, aplikasi petani
// akan menggunakan cara lama (hantar dokumen secara manual).
const API_URL = "";

// Senarai mukim dan nombor WhatsApp Agen Pengembangan Tanaman.
// Susunan mesti sama dengan senarai MUKIM dalam apps-script/Code.gs.
const MUKIM = [
  { nama: "Sungai Manik / Labu Kubong", telefon: "0193776984" },
  { nama: "Sungai Durian",              telefon: "0193074977" },
  { nama: "Durian Sebatang",            telefon: "01113297751" },
  { nama: "Changkat Jong",              telefon: "0108475362" },
  { nama: "Hutan Melintang",            telefon: "0165237280" },
  { nama: "Bagan Datuk",                telefon: "0134018473" },
  { nama: "Rungkup",                    telefon: "0194795013" },
  { nama: "Teluk Bharu",                telefon: "0134734476" },
];

// Panggil pelayan (Google Apps Script). Badan dihantar sebagai
// text/plain supaya pelayar tidak membuat permintaan "preflight".
async function panggilApi(tindakan, data = {}) {
  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ tindakan, ...data }),
  });
  if (!res.ok) throw new Error("Pelayan tidak dapat dihubungi (" + res.status + ").");
  const json = await res.json();
  if (!json.ok) throw new Error(json.ralat || "Ralat tidak diketahui.");
  return json;
}
