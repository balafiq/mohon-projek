# Panduan Persediaan Sistem Permohonan Projek Pertanian

Sistem ini ada dua aplikasi:

| Aplikasi | Pautan | Pengguna |
|---|---|---|
| Permohonan petani | `https://balafiq.github.io/mohon-projek/` | Petani |
| Portal agen | `https://balafiq.github.io/mohon-projek/agen.html` | Agen Pengembangan Tanaman (perlu log masuk) |

Dokumen petani disimpan dalam **Google Drive anda secara peribadi** (tidak dikongsi kepada sesiapa).
Agen hanya boleh melihat dokumen melalui portal agen selepas log masuk, dan setiap agen hanya
nampak permohonan bagi mukim mereka sahaja. Semua permohonan juga direkodkan dalam Google Sheet.

Semuanya **percuma** menggunakan akaun Gmail.

---

## Langkah 1: Cipta Google Apps Script

1. Log masuk ke Gmail pejabat (akaun yang akan menyimpan semua dokumen).
2. Buka <https://script.google.com> dan tekan **New project** (Projek baharu).
3. Tukar nama projek (di atas, "Untitled project") kepada `Permohonan Projek Pertanian`.
4. Padam semua kod sedia ada dalam `Code.gs`.
5. Salin **semua** kandungan fail [`apps-script/Code.gs`](apps-script/Code.gs) dan tampal ke dalam editor.
6. Tekan ikon **Save** (💾).

## Langkah 2: Jalankan persediaan & dapatkan kata laluan agen

1. Di bar atas editor, pilih fungsi **`sediakan`** dalam senarai, kemudian tekan **Run**.
2. Google akan meminta kebenaran:
   **Review permissions → pilih akaun anda → Advanced → Go to Permohonan Projek Pertanian (unsafe) → Allow**.
   (Amaran "unsafe" ini biasa untuk skrip yang anda cipta sendiri.)
3. Selepas selesai, lihat **Execution log** di bawah. Anda akan nampak:
   - **Kata laluan bagi setiap mukim.** Salin dan simpan di tempat selamat, kemudian berikan
     kepada agen masing-masing.
   - Pautan folder Google Drive (tempat dokumen disimpan).
   - Pautan Google Sheet (rekod semua permohonan).

> Kata laluan hanya dipaparkan **sekali**. Jika hilang, jalankan `janaSemuaKataLaluan` untuk
> menjana kata laluan baharu bagi semua mukim, atau tukar nilai `MUKIM_UNTUK_RESET` (1-8) di
> bahagian atas kod dan jalankan `resetKataLaluanSatuMukim` untuk satu mukim sahaja.

## Langkah 3: Terbitkan (Deploy) sebagai Web App

1. Tekan **Deploy → New deployment**.
2. Tekan ikon ⚙️ di sebelah "Select type" dan pilih **Web app**.
3. Isi:
   - **Description:** `Versi 1`
   - **Execute as:** **Me** (akaun anda)
   - **Who has access:** **Anyone**
4. Tekan **Deploy**, kemudian salin **Web app URL**
   (bermula dengan `https://script.google.com/macros/s/.../exec`).

## Langkah 4: Sambungkan aplikasi

Berikan Web app URL tersebut kepada Claude, atau ubah sendiri baris ini dalam `config.js`:

```js
const API_URL = "https://script.google.com/macros/s/XXXXXXXX/exec";
```

Selepas `config.js` dikemas kini di GitHub, aplikasi akan menggunakan sistem baharu dalam 1-2 minit.

---

## Cara sistem berfungsi

**Petani:**
1. Jawab soalan kelayakan, isi borang dan muat naik dokumen.
2. Tekan **Hantar Permohonan**: dokumen dimuat naik ke Google Drive dan petani mendapat
   **No. rujukan** (contoh `PP261123-AB3K`).
3. Tekan **Hantar Mesej ke WhatsApp Agen**: WhatsApp agen dibuka dengan mesej yang mengandungi
   no. rujukan dan pautan ke portal agen.

**Agen:**
1. Tekan pautan dalam mesej WhatsApp (atau buka portal agen).
2. Pilih mukim dan masukkan kata laluan.
3. Lihat semua permohonan mukim tersebut, buka/muat turun dokumen, dan tukar status
   (Baru / Sedang disemak / Lulus / Tidak lulus).

## Jika kod `Code.gs` dikemas kini

Tampal kod baharu, Save, kemudian **Deploy → Manage deployments → ✏️ (Edit) → Version: New version → Deploy**.
URL kekal sama, jadi `config.js` tidak perlu diubah.

## Keselamatan

- Folder dokumen dan Google Sheet adalah peribadi dalam akaun Gmail anda. Jangan kongsikan folder tersebut.
- Kata laluan disimpan dalam bentuk *hash* (tidak boleh dibaca semula).
- Selepas 5 cubaan kata laluan salah, log masuk mukim tersebut disekat selama 15 minit.
- Sesi agen tamat secara automatik selepas 6 jam.
- Jika seorang agen bertukar, jana kata laluan baharu untuk mukim tersebut.

## Had percuma Google

- Google Drive: 15 GB (lebih kurang 3,000 permohonan jika setiap permohonan ~5 MB).
  Gambar dikecilkan secara automatik sebelum dimuat naik.
- Saiz maksimum satu fail: 8 MB.
