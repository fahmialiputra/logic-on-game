// materials.js - Konten Pembelajaran dengan Pseudo-code & Accordion
const materiData = `
    <div class="accordion-item">
        <div class="accordion-header">🛡️ 1. Awas Nabrak Tembok! (Logika Tabrakan) <span>▼</span></div>
        <div class="accordion-content">
            <div class="accordion-body">
                <p>Komputer mengecek posisimu setiap kali kamu mau melangkah. Jika di depanmu ada tembok, komputer mengubah kecepatanmu menjadi 0. Perhatikan urutan kodenya:</p>
                <div class="pseudo-code">START FUNGSI Gerak(Arah)
  SET KotakDepan = Posisi_Sekarang + Arah
  IF KotakDepan ADALAH Tembok THEN
    Kecepatan = 0
    MAINKAN_SUARA "Dug!"
  ELSE
    Kecepatan = 1
    PINDAH_KARAKTER(KotakDepan)
  END IF
END FUNGSI</div>
            </div>
        </div>
    </div>
    <div class="accordion-item">
        <div class="accordion-header">🔑 2. Kantongi Kuncinya! (Logika Item) <span>▼</span></div>
        <div class="accordion-content">
            <div class="accordion-body">
                <p>Variabel adalah kotak penyimpanan di komputer. Awalnya, status 'Punya_Kunci' adalah SALAH. Saat kamu menyentuh kunci emas, komputer mengubah status itu menjadi BENAR.</p>
                <div class="pseudo-code">START FUNGSI Cek_Item()
  IF Posisi_Pemain == Posisi_Kunci THEN
    HAPUS_GAMBAR_KUNCI_DI_LANTAI
    Punya_Kunci = BENAR
    MAINKAN_SUARA "Ting!"
  END IF
END FUNGSI</div>
            </div>
        </div>
    </div>
    <div class="accordion-item">
        <div class="accordion-header">⚔️ 3. Serang Monsternya! (Logika HP & ATK) <span>▼</span></div>
        <div class="accordion-content">
            <div class="accordion-body">
                <p>Pertarungan game adalah operasi matematika. Saat monster menyerang (ATK), baju besimu (DEF) akan menahannya sedikit, lalu sisanya baru mengurangi Darahmu (HP).</p>
                <div class="pseudo-code">START FUNGSI Kena_Serang(ATK_Monster)
  Luka = ATK_Monster - DEF_Pemain
  IF Luka > 0 THEN
    HP_Pemain = HP_Pemain - Luka
  END IF
  IF HP_Pemain <= 0 THEN
    PANGGIL FUNGSI Game_Over()
  END IF
END FUNGSI</div>
            </div>
        </div>
    </div>
    <div class="accordion-item">
        <div class="accordion-header">🚪 4. Pintu Keluar Terbuka! (Logika AND) <span>▼</span></div>
        <div class="accordion-content">
            <div class="accordion-body">
                <p>Operator 'AND' (DAN) mewajibkan SEMUA syarat terpenuhi. Jika ada satu syarat yang kurang, level tidak akan selesai.</p>
                <div class="pseudo-code">START FUNGSI Cek_Menang()
  IF (Di_Depan_Pintu == BENAR) AND 
     (Punya_Kunci == BENAR) AND 
     (HP_Pemain > 0) THEN
     
     TAMPILKAN_TEKS "LEVEL SELESAI!"
     PANGGIL FUNGSI Buka_Level_Selanjutnya()
     
  ELSE
     TAMPILKAN_TEKS "Syarat belum lengkap..."
  END IF
END FUNGSI</div>
            </div>
        </div>
    </div>`;

document.addEventListener('DOMContentLoaded', () => {
    const materiContainer = document.getElementById('content-materi');
    if(materiContainer) materiContainer.innerHTML = materiData;

    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('pointerdown', () => {
            const currentItem = header.parentElement;
            const isActive = currentItem.classList.contains('active');
            
            document.querySelectorAll('.accordion-item').forEach(item => {
                item.classList.remove('active');
                item.querySelector('span').innerText = '▼';
            });
            
            if (!isActive) {
                currentItem.classList.add('active');
                header.querySelector('span').innerText = '▲';
            }
        });
    });

    const tabMateri = document.getElementById('tab-materi');
    const tabQuiz = document.getElementById('tab-quiz');
    const contentQuiz = document.getElementById('content-quiz');
    
    if(tabMateri && tabQuiz) {
        tabMateri.addEventListener('pointerdown', () => {
            tabMateri.classList.add('active'); tabQuiz.classList.remove('active');
            materiContainer.classList.remove('hidden'); contentQuiz.classList.add('hidden');
        });
        tabQuiz.addEventListener('pointerdown', () => {
            tabQuiz.classList.add('active'); tabMateri.classList.remove('active');
            contentQuiz.classList.remove('hidden'); materiContainer.classList.add('hidden');
        });
    }
});