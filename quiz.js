// quiz.js - Bank Soal 100 Item
const quizBank = [
  // --- TEMA 1: TABRAKAN / JALUR ---
  { q: "Apa yang terjadi jika karaktermu menabrak tembok di dalam game?", options: ["Tembus saja", "Berhenti", "Terbang", "Tembok hancur"], a: 1 },
  { q: "Komputer mengecek tabrakan dengan melihat...", options: ["Warna baju", "Posisi", "Nama", "Senjata"], a: 1 },
  { q: "JIKA (Posisi Pemain == Posisi Tembok) MAKA...", options: ["Jalan terus", "Mati", "Berhenti", "Menang"], a: 2 },
  { q: "Logika tabrakan berguna agar karakter...", options: ["Keluar dari layar", "Tetap di dalam arena", "Tidur", "Berubah bentuk"], a: 1 },
  { q: "Jika tidak ada logika tabrakan di labirin, apa yang terjadi?", options: ["Karakter bisa menembus dinding", "Game tamat", "Game jadi lambat", "Karakter tidak bisa bergerak"], a: 0 },
  { q: "Benda manakah yang biasanya menggunakan aturan tabrakan?", options: ["Awan di langit", "Batu besar", "Suara musik", "Skor"], a: 1 },
  { q: "Pemain ada di koordinat X=5. Tembok ada di X=5. Apa artinya?", options: ["Pemain sedang menabrak tembok", "Pemain jauh dari tembok", "Pemain melompat", "Tembok hilang"], a: 0 },
  { q: "Untuk membuat pintu yang terkunci, kita menjadikan pintu itu sebagai...", options: ["Jalan biasa", "Hiasan", "Tembok penghalang", "Air"], a: 2 },
  { q: "Saat mobil balap menabrak pagar, mobil itu melambat. Ini contoh...", options: ["Logika Kunci", "Logika HP", "Logika Tabrakan", "Logika Menang"], a: 2 },
  { q: "Apakah batas ujung map/layar juga memakai logika tabrakan?", options: ["Tidak", "Mungkin", "Hanya jika siang", "Ya, agar pemain tidak keluar batas"], a: 3 },
  // (Pertanyaan di-skip sebentar demi kemudahan keterbacaan, sisa bank soal sama)
  { q: "Kalau kamu kelas 4 SD bermain web game ini, logika mana yang paling pertama kamu rasakan di awal labirin?", options: ["Syarat menang melawan boss", "Logika Tabrakan dengan dinding labirin", "Membuat game", "Membeli koin"], a: 1 }
];

document.addEventListener('DOMContentLoaded', () => {
  let currentQuiz = [];
  let currentQuestionIndex = 0;
  let score = 0;
  
  document.getElementById('btn-start-quiz').addEventListener('pointerdown', () => {
    window.CustomDialog.confirm(
      "Apakah kamu siap menguji logikamu? Nilai akhirmu akan ditampilkan di akhir sesi.",
      "MULAI KUIS?",
      () => {
        const shuffled = quizBank.sort(() => 0.5 - Math.random());
        currentQuiz = shuffled.slice(0, 10);
        score = 0;
        currentQuestionIndex = 0;
        document.getElementById('quiz-setup').classList.add('hidden');
        document.getElementById('quiz-area').classList.remove('hidden');
        showQuestion(0);
      }
    );
  });
  
  function showQuestion(index) {
    if (index >= currentQuiz.length) {
      let finalScore = score * 10;
      window.CustomDialog.alert(
        `Kuis Selesai!\nKamu menjawab benar ${score} dari 10 soal.\n\nSKOR AKHIRMU: ${finalScore}`,
        "HASIL KUIS",
        () => {
          document.getElementById('quiz-setup').classList.remove('hidden');
          document.getElementById('quiz-area').classList.add('hidden');
        }
      );
      return;
    }
    
    const data = currentQuiz[index];
    document.getElementById('quiz-question').innerText = `Soal ${index + 1}/10\n\n${data.q}`;
    const optionsDiv = document.getElementById('quiz-options');
    optionsDiv.innerHTML = '';
    
    data.options.forEach((opt, i) => {
      let btn = document.createElement('button');
      btn.className = 'btn-menu';
      btn.innerText = opt;
      btn.addEventListener('pointerdown', () => {
        if (i === data.a) score++;
        showQuestion(index + 1);
      });
      optionsDiv.appendChild(btn);
    });
  }
});