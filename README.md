# 🕹️ Logic on Game
**Logic on Game** adalah sebuah *web-based game* (HTML5 Canvas) bergenre Maze Crawler / Action-RPG yang menawan. Dilengkapi dengan dukungan *local multiplayer* (Split-screen) secara simultan. Proyek ini tidak hanya menawarkan gameplay kompetitif dan eksplorasi seru, melainkan juga berfungsi sebagai wahana **Edukasi Algoritma Interaktif** untuk pemrograman game pemula!

---

## 🚀 Fitur & Pembaruan Utama (Versi Terbaru)

*   📱 **Single Input Source Management** — Bebas memilih jenis input (*Keyboard, Layar Sentuh Virtual, atau Gamepad Fisik*) secara spesifik untuk tiap pemain. Hindari *ghost input*! Terdapat pula tombol *Toggle* langsung di header saat permainan berlangsung.
*   🎮 **Dukungan Penuh Gamepad** — Integrasi presisi *Joystick/D-Pad* fisik. Termasuk kemampuan fokus UI (Menu Override) yang memungkinkan navigasi *Inventory (Tas)* memakai arah D-pad dan tombol interaksi fisik secara mulus.
*   🗺️ **Static Adaptive Maze Size** — Sistem labirin pintar yang ukurannya disesuaikan secara default berdasarkan tingkat kesulitan, tidak lagi melebar seiring progres game, memastikan framerate tetap optimal.
*   ☁️ **Serverless API Leaderboard Sync** — Sistem penyimpanan skor di Google Sheets yang sudah dihubungkan otomatis ke konfigurasi inti (tanpa input manual).
*   ⚙️ **Pengaturan Konfigurasi Default yang Optimal** — *Smooth Movement* (Pergerakan Analog) dan Batas Restart (Mode Endless) sekarang aktif sejak awal permainan. 

---

## 📖 Cara Bermain & Alur Game

1. **Persiapan Menu**: Pilih di antara mode **Time Trial** (Berpacu waktu), **Speedrun** (Tamat stage secepatnya), atau **Endless** (Bertahan sepuasnya). Anda bisa mengatur interval kemunculan Boss sesuai keinginan.
2. **Eksplorasi Labirin Prosedural**: Telusuri ruang-ruang acak (menggunakan DFS Carving) demi mencari **Kunci Emas 🔑** dan pintu keluar 🚪.
3. **Persenjatai Dirimu**: Kumpulkan *Loot* dari tanah! Mulai dari Pedang Kayu 🗡️, Eliksir Kehidupan 🩸, hingga Artefak Epic penyerap *damage* 💠.
4. **Pertarungan Brutal**: Monster biasa akan terus berkeliling dan memburumu jika masuk ke jarak pandangnya (*Line of Sight*). Kalahkan mereka demi skor, lalu bersiaplah menghadapi **Demon Lord 👹**.
5. **Kebangkitan (Resurrection)**: Mati bukanlah akhir. Korbankan persentase skor untuk bangkit kembali sebagai wujud Mukjizat 👼 (Jika limit belum habis!).

---

## ⌨️ Panduan Kontrol & Input (Multiplayer)

> **Catatan:** Tekan tombol **Toggle Icon** (⌨️ / 📱 / 🎮) di papan skor bagian atas saat bermain untuk merotasi jenis kontrol input secara on-the-fly!

| Aksi | Player 1 (Keyboard) | Player 2 (Keyboard) | Gamepad Fisik (Xbox/PS) |
| :--- | :--- | :--- | :--- |
| **Bergerak** | `W, A, S, D` | `Panah Arah` | Analog Kiri / D-Pad |
| **Serang Musuh** | `Spasi` | `Enter / Numpad 0` | Tombol Bawah (A / Silang) |
| **Ambil Item** | `E` | `Shift / Control Kanan` | Tombol Kanan (B / Lingkaran) |
| **Buka/Tutup Tas** | `Q` atau `Y` | `P` atau `O` | Tombol Atas (Y / Segitiga) |
| **Navigasi Tas** | `Arah WASD` | `Panah Arah` | Analog / D-Pad |
| **Gunakan Item** | `Spasi` atau `Enter` | `Numpad 0` atau `Enter` | Tombol Bawah (A / Silang) |

---

## 🧠 Modul Pembelajaran (Logika di Balik Layar)

Klik menu **📚 Review Materi** pada halaman awal untuk menemukan rahasia dapur pembuatan game ini!
Pemain diajarkan mengenai:
*   **Logika Tabrakan (Collision)** — Memahami X, Y dan sumbu area.
*   **Pemrograman Variabel** — Bagaimana cara game menyimpan status `Punya_Kunci`.
*   **Matematika Pertarungan** — Rahasia di balik `Sisa HP = Max HP - (ATK Musuh - DEF Kamu)`.
*   **Kuis Algoritma** — Uji nyalimu dalam memecahkan soal pseudo-code!

---

*Dikembangkan untuk eksperimentasi Logika Algoritma Dasar berbasis Vanilla Javascript Canvas.*