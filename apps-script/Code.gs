/**
 * Pelayan aplikasi Permohonan Projek Pertanian (Google Apps Script).
 *
 * - Menerima permohonan daripada petani, menyimpan dokumen dalam
 *   folder Google Drive PERIBADI (tidak dikongsi) dan merekod
 *   permohonan dalam Google Sheet.
 * - Agen log masuk dengan kata laluan mukim masing-masing untuk
 *   melihat permohonan dan dokumen bagi mukim mereka sahaja.
 *
 * Cara pasang: rujuk PANDUAN.md.
 */

// Susunan mesti sama dengan MUKIM dalam config.js
const MUKIM = [
  'Sungai Manik / Labu Kubong',
  'Sungai Durian',
  'Durian Sebatang',
  'Changkat Jong',
  'Hutan Melintang',
  'Bagan Datuk',
  'Rungkup',
  'Teluk Bharu',
];

const JENIS_FAIL = {
  gambarProjek: 'Gambar projek',
  kadPengenalan: 'Kad pengenalan',
  geranTanah: 'Geran tanah',
};
const STATUS = ['Baru', 'Sedang disemak', 'Lulus', 'Tidak lulus'];
const MAKS_FAIL = 15;                 // bilangan fail maksimum satu permohonan
const MAKS_SAIZ = 8 * 1024 * 1024;    // 8 MB satu fail
const TEMPOH_SESI = 6 * 60 * 60;      // 6 jam (saat)
const LAJUR = ['No. Rujukan', 'Tarikh', 'Nama', 'Lokasi', 'Jenis Tanaman',
               'No. Mukim', 'Mukim', 'ID Folder', 'Fail (JSON)', 'Status'];

// Untuk menetapkan semula kata laluan SATU mukim sahaja:
// tukar nombor ini (1-8), kemudian jalankan fungsi resetKataLaluanSatuMukim.
const MUKIM_UNTUK_RESET = 1;

// ------------------------------------------------------------
// FUNGSI PERSEDIAAN (jalankan dari editor Apps Script)
// ------------------------------------------------------------

/** Jalankan SEKALI selepas menampal kod ini. */
function sediakan() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('FOLDER_ID')) {
    const folder = DriveApp.createFolder('Permohonan Projek Pertanian - Dokumen');
    props.setProperty('FOLDER_ID', folder.getId());
  }
  if (!props.getProperty('SHEET_ID')) {
    const ss = SpreadsheetApp.create('Rekod Permohonan Projek Pertanian');
    const sh = ss.getSheets()[0];
    sh.setName('Permohonan');
    sh.appendRow(LAJUR);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, LAJUR.length).setFontWeight('bold');
    props.setProperty('SHEET_ID', ss.getId());
  }
  if (!props.getProperty('HASH_1')) {
    janaSemuaKataLaluan();
  } else {
    Logger.log('Kata laluan sudah wujud. Jalankan janaSemuaKataLaluan untuk menjana semula.');
  }
  Logger.log('Folder dokumen: ' + DriveApp.getFolderById(props.getProperty('FOLDER_ID')).getUrl());
  Logger.log('Google Sheet rekod: ' + SpreadsheetApp.openById(props.getProperty('SHEET_ID')).getUrl());
}

/** Jana kata laluan baharu untuk SEMUA mukim dan paparkannya dalam log. */
function janaSemuaKataLaluan() {
  Logger.log('=== KATA LALUAN AGEN (simpan dan berikan kepada agen) ===');
  MUKIM.forEach(function (nama, i) {
    Logger.log((i + 1) + '. ' + nama + ' : ' + tetapkanKataLaluan_(i + 1));
  });
}

/** Jana kata laluan baharu untuk mukim MUKIM_UNTUK_RESET sahaja. */
function resetKataLaluanSatuMukim() {
  const no = MUKIM_UNTUK_RESET;
  if (!(no >= 1 && no <= MUKIM.length)) throw new Error('MUKIM_UNTUK_RESET mesti 1 hingga ' + MUKIM.length);
  Logger.log(no + '. ' + MUKIM[no - 1] + ' : ' + tetapkanKataLaluan_(no));
}

function tetapkanKataLaluan_(no) {
  const huruf = 'abcdefghjkmnpqrstuvwxyz23456789';
  let kl = '';
  for (let i = 0; i < 10; i++) kl += huruf.charAt(Math.floor(Math.random() * huruf.length));
  const garam = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperties({
    ['GARAM_' + no]: garam,
    ['HASH_' + no]: hash_(garam + kl),
  });
  return kl;
}

// ------------------------------------------------------------
// TITIK MASUK WEB
// ------------------------------------------------------------

function doGet() {
  return ContentService.createTextOutput('Pelayan Permohonan Projek Pertanian sedang berjalan.');
}

function doPost(e) {
  let hasil;
  try {
    const req = JSON.parse(e.postData.contents);
    switch (req.tindakan) {
      case 'mohon':   hasil = mohon_(req); break;
      case 'login':   hasil = login_(req); break;
      case 'senarai': hasil = senarai_(req); break;
      case 'fail':    hasil = fail_(req); break;
      case 'status':  hasil = kemasKiniStatus_(req); break;
      case 'logout':  hasil = logout_(req); break;
      default: throw new Error('Tindakan tidak sah.');
    }
    hasil.ok = true;
  } catch (err) {
    hasil = { ok: false, ralat: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(hasil))
    .setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------
// PETANI: HANTAR PERMOHONAN
// ------------------------------------------------------------

function mohon_(req) {
  const nama = teks_(req.nama, 'Nama', 150);
  const lokasi = teks_(req.lokasi, 'Lokasi projek', 300);
  const tanaman = teks_(req.tanaman, 'Jenis tanaman', 150);
  const mukim = Number(req.mukim);
  if (!(mukim >= 0 && mukim < MUKIM.length) || Math.floor(mukim) !== mukim) throw new Error('Mukim tidak sah.');

  const fail = Array.isArray(req.fail) ? req.fail : [];
  if (fail.length === 0 || fail.length > MAKS_FAIL) throw new Error('Bilangan dokumen tidak sah.');
  Object.keys(JENIS_FAIL).forEach(function (j) {
    if (!fail.some(function (f) { return f.jenis === j; })) throw new Error(JENIS_FAIL[j] + ' tidak dimuat naik.');
  });

  const blobs = fail.map(function (f) {
    if (!JENIS_FAIL[f.jenis]) throw new Error('Jenis dokumen tidak sah.');
    const mime = String(f.mimeType || '');
    if (!/^image\//.test(mime) && mime !== 'application/pdf') throw new Error('Hanya gambar atau PDF dibenarkan.');
    const bytes = Utilities.base64Decode(String(f.data || ''));
    if (bytes.length === 0 || bytes.length > MAKS_SAIZ) throw new Error('Saiz fail tidak sah (maksimum 8 MB).');
    const namaFail = JENIS_FAIL[f.jenis] + ' - ' + String(f.nama || 'fail').replace(/[\\/:*?"<>|]/g, '_').slice(0, 80);
    return { jenis: f.jenis, blob: Utilities.newBlob(bytes, mime, namaFail) };
  });

  const ref = janaRujukan_();
  const induk = DriveApp.getFolderById(prop_('FOLDER_ID'));
  const folder = induk.createFolder(ref + ' - ' + nama);
  const senaraiFail = blobs.map(function (b) {
    const f = folder.createFile(b.blob);
    return { id: f.getId(), jenis: b.jenis, nama: f.getName(), mimeType: b.blob.getContentType() };
  });

  const kunci = LockService.getScriptLock();
  kunci.waitLock(20000);
  try {
    helaian_().appendRow([ref, new Date(), nama, lokasi, tanaman, mukim + 1, MUKIM[mukim],
                          folder.getId(), JSON.stringify(senaraiFail), STATUS[0]]);
  } finally {
    kunci.releaseLock();
  }
  return { rujukan: ref };
}

function janaRujukan_() {
  const tarikh = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyMMdd');
  const huruf = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let r = '';
  for (let i = 0; i < 4; i++) r += huruf.charAt(Math.floor(Math.random() * huruf.length));
  return 'PP' + tarikh + '-' + r;
}

// ------------------------------------------------------------
// AGEN: LOG MASUK & LIHAT PERMOHONAN
// ------------------------------------------------------------

function login_(req) {
  const no = Number(req.mukim) + 1;
  if (!(no >= 1 && no <= MUKIM.length)) throw new Error('Mukim tidak sah.');
  const cache = CacheService.getScriptCache();
  const kunciCuba = 'cuba_' + no;
  const cuba = Number(cache.get(kunciCuba) || 0);
  if (cuba >= 5) throw new Error('Terlalu banyak cubaan. Sila cuba lagi selepas 15 minit.');

  const props = PropertiesService.getScriptProperties();
  const garam = props.getProperty('GARAM_' + no);
  const sah = garam && hash_(garam + String(req.kataLaluan || '').trim()) === props.getProperty('HASH_' + no);
  if (!sah) {
    cache.put(kunciCuba, String(cuba + 1), 15 * 60);
    throw new Error('Kata laluan salah.');
  }
  cache.remove(kunciCuba);
  const token = Utilities.getUuid() + Utilities.getUuid();
  cache.put('tok_' + token, String(no - 1), TEMPOH_SESI);
  return { token: token, mukim: no - 1, namaMukim: MUKIM[no - 1] };
}

function logout_(req) {
  CacheService.getScriptCache().remove('tok_' + String(req.token || ''));
  return {};
}

function sesi_(req) {
  const m = CacheService.getScriptCache().get('tok_' + String(req.token || ''));
  if (m === null) {
    const e = new Error('Sesi tamat. Sila log masuk semula.');
    throw e;
  }
  return Number(m);
}

function senarai_(req) {
  const mukim = sesi_(req);
  const data = helaian_().getDataRange().getValues().slice(1);
  const hasil = [];
  data.forEach(function (r) {
    if (Number(r[5]) - 1 !== mukim) return;
    const fail = JSON.parse(r[8] || '[]').map(function (f) {
      return { id: f.id, jenis: JENIS_FAIL[f.jenis] || f.jenis, nama: f.nama, mimeType: f.mimeType };
    });
    hasil.push({
      rujukan: r[0],
      tarikh: r[1] instanceof Date ? r[1].toISOString() : String(r[1]),
      nama: r[2], lokasi: r[3], tanaman: r[4],
      fail: fail, status: r[9] || STATUS[0],
    });
  });
  hasil.reverse(); // terbaru dahulu
  return { permohonan: hasil, senaraiStatus: STATUS };
}

function cariBaris_(mukim, ref) {
  const sh = helaian_();
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === ref && Number(data[i][5]) - 1 === mukim) return { sh: sh, baris: i + 1, r: data[i] };
  }
  throw new Error('Permohonan tidak dijumpai.');
}

function fail_(req) {
  const mukim = sesi_(req);
  const b = cariBaris_(mukim, String(req.rujukan || ''));
  const fail = JSON.parse(b.r[8] || '[]');
  const f = fail.filter(function (x) { return x.id === req.idFail; })[0];
  if (!f) throw new Error('Dokumen tidak dijumpai.');
  const blob = DriveApp.getFileById(f.id).getBlob();
  return { nama: f.nama, mimeType: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) };
}

function kemasKiniStatus_(req) {
  const mukim = sesi_(req);
  if (STATUS.indexOf(req.status) < 0) throw new Error('Status tidak sah.');
  const b = cariBaris_(mukim, String(req.rujukan || ''));
  b.sh.getRange(b.baris, 10).setValue(req.status);
  return {};
}

// ------------------------------------------------------------
// PEMBANTU
// ------------------------------------------------------------

function prop_(k) {
  const v = PropertiesService.getScriptProperties().getProperty(k);
  if (!v) throw new Error('Pelayan belum disediakan. Jalankan fungsi sediakan.');
  return v;
}

function helaian_() {
  return SpreadsheetApp.openById(prop_('SHEET_ID')).getSheetByName('Permohonan');
}

function teks_(v, label, maks) {
  const s = String(v == null ? '' : v).trim();
  if (!s) throw new Error(label + ' wajib diisi.');
  if (s.length > maks) throw new Error(label + ' terlalu panjang.');
  // Elak formula dalam Google Sheet
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function hash_(s) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8));
}
