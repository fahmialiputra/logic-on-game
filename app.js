window.GameAssets = {
  images: {},
  placeholders: {
    player1: 'assets/img/p1.png',
    player2: 'assets/img/p2.png',
    dead: 'assets/img/dead.png',
    enemy_dark: 'assets/img/vampire.png',
    enemy_beast: 'assets/img/werewolf.png',
    enemy_boss: 'assets/img/boss.png',
    door_closed: 'assets/img/door_closed.png',
    door_open: 'assets/img/door_open.png',
    key: 'assets/img/key.png',
    // Placeholder untuk ID item di ITEM_DB
    item_10: 'assets/img/item10.png',
    item_11: 'assets/img/item11.png',
    item_19: 'assets/img/item19.png'
  },
  loadedCount: 0,
  totalCount: 0,
  init: function(onComplete) {
    this.totalCount = Object.keys(this.placeholders).length;
    if (this.totalCount === 0) return onComplete();
    
    for (let key in this.placeholders) {
      let img = new Image();
      img.src = this.placeholders[key];
      img.onload = () => {
        this.images[key] = img;
        this.checkComplete(onComplete);
      };
      img.onerror = () => {
        // Jika gagal muat, abaikan (otomatis akan fallback menggunakan emoji di mazeEngine)
        this.checkComplete(onComplete);
      };
    }
  },
  checkComplete: function(onComplete) {
    this.loadedCount++;
    let pct = Math.floor((this.loadedCount / this.totalCount) * 100);
    let textEl = document.getElementById('loading-text');
    if (textEl) textEl.innerText = `${pct}%`;
    if (this.loadedCount >= this.totalCount) {
      setTimeout(onComplete, 300); // Selesai
    }
  }
};

window.GameConfig = { timer: 2, diff: 3, smooth: false, enemyHpView: 'angka', mode: 'time-trial', maxStage: 5, players: 2 };

window.CustomDialog = {
  show: function(title, message, buttons) {
    const modal = document.getElementById('custom-modal');
    document.getElementById('custom-modal-title').innerText = title;
    document.getElementById('custom-modal-message').innerText = message;
    
    const btnContainer = document.getElementById('custom-modal-buttons');
    btnContainer.innerHTML = '';
    
    buttons.forEach(btnInfo => {
      const btn = document.createElement('button');
      btn.className = `btn-menu arcade-btn ${btnInfo.class || ''}`;
      btn.style.padding = "10px";
      btn.innerText = btnInfo.text;
      btn.addEventListener('pointerdown', () => {
        modal.classList.add('hidden');
        if (btnInfo.onClick) btnInfo.onClick();
      });
      btnContainer.appendChild(btn);
    });
    modal.classList.remove('hidden');
  },
  alert: function(message, title = "PERHATIAN", callback = null) {
    this.show(title, message, [{ text: "OK", onClick: callback }]);
  },
  confirm: function(message, title = "KONFIRMASI", onConfirm, onCancel = null) {
    this.show(title, message, [
      { text: "YA", class: "", onClick: onConfirm },
      { text: "TIDAK", class: "cancel", onClick: onCancel }
    ]);
  }
};

function loadLeaderboard() {
  let lbData = JSON.parse(localStorage.getItem('logicGameLB') || '[]');
  let ul = document.getElementById('leaderboard-list');
  ul.innerHTML = '';
  
  if (lbData.length === 0) {
    ul.innerHTML = '<li style="text-align:center; color:#aaa; font-size:0.7rem; padding:10px;">Belum ada data.</li>';
    return;
  }
  
  lbData.sort((a, b) => b.score - a.score).slice(0, 5).forEach((entry, i) => {
    let li = document.createElement('li');
    li.className = 'lb-item';
    li.innerHTML = `<span>#${i+1} ${entry.name}</span> <span>St.${entry.stage} | ${entry.score} pts</span>`;
    ul.appendChild(li);
  });
}

document.addEventListener('DOMContentLoaded', () => {
      // Memuat aset terlebih dahulu sebelum masuk ke menu
      window.GameAssets.init(() => {
        document.getElementById('screen-loading').classList.add('hidden');
        document.getElementById('screen-title').classList.remove('hidden');
      });
  document.addEventListener('contextmenu', event => event.preventDefault());
  document.addEventListener('gesturestart', event => event.preventDefault());
  
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function(event) {
    let now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) event.preventDefault();
    lastTouchEnd = now;
  }, false);
  
  document.addEventListener('touchmove', function(e) {
    if (e.target.closest('.inv-overlay') || e.target.closest('.accordion-body') ||
      e.target.closest('.modal-content') || e.target.closest('#leaderboard-panel') ||
      e.target.closest('.mode-options')) {
      return;
    }
    e.preventDefault();
  }, { passive: false });
  
  const screens = {
    title: document.getElementById('screen-title'),
    menu: document.getElementById('screen-menu'),
    modeSelect: document.getElementById('screen-mode-select'),
    review: document.getElementById('screen-review'),
    gameSetup: document.getElementById('screen-game-setup'),
    game: document.getElementById('screen-game'),
    gameover: document.getElementById('screen-gameover')
  };
  
  function switchScreen(targetId) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[targetId].classList.remove('hidden');
  }
  
  screens.title.addEventListener('pointerdown', () => switchScreen('menu'));
  document.getElementById('btn-review').addEventListener('pointerdown', () => switchScreen('review'));
  
  // Perubahan Routing Alur Mulai
  document.getElementById('btn-play').addEventListener('pointerdown', () => switchScreen('modeSelect'));
  
  document.getElementById('btn-next-setup').addEventListener('pointerdown', () => {
    // Ambil Konfigurasi Mode
    const selMode = document.querySelector('input[name="game-mode"]:checked');
    window.GameConfig.mode = selMode ? selMode.value : 'time-trial';
    
    const selPlayers = document.querySelector('input[name="player-count"]:checked');
    window.GameConfig.players = selPlayers ? parseInt(selPlayers.value) : 2;
    
    // Atur UI Input Nama
    if (window.GameConfig.players === 1) {
      document.getElementById('p2-input-group').classList.add('hidden');
    } else {
      document.getElementById('p2-input-group').classList.remove('hidden');
    }
    
    switchScreen('gameSetup');
  });
  
  document.getElementById('btn-leaderboard').addEventListener('pointerdown', () => {
    const panel = document.getElementById('leaderboard-panel');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) loadLeaderboard();
  });
  
  document.getElementById('btn-reset-game').addEventListener('pointerdown', () => {
    window.CustomDialog.confirm("Hapus seluruh data Leaderboard secara permanen?", "HAPUS DATA", () => {
      localStorage.removeItem('logicGameLB');
      loadLeaderboard();
      window.CustomDialog.alert("Data Leaderboard berhasil dihapus.", "BERHASIL");
    });
  });
  
  document.getElementById('btn-home-gameover').addEventListener('pointerdown', () => {
    switchScreen('menu');
    document.getElementById('leaderboard-panel').classList.add('hidden');
  });
  
  document.querySelectorAll('.btn-back, .btn-back-slim').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
      if (e.target.closest('#screen-game')) {
        window.CustomDialog.confirm("Keluar dari game? Progress tidak akan disimpan.", "KELUAR?", () => {
          if (window.gameInterval) clearInterval(window.gameInterval);
          if (window.enemyInterval) clearInterval(window.enemyInterval);
          if (window.deathTimeout) clearTimeout(window.deathTimeout); // <- TAMBAHAN BARU
          
          window.isGameActive = false;
          switchScreen('menu');
        });
      } else switchScreen('menu');
    });
  });
  
  const modalSetting = document.getElementById('modal-setting');
  document.getElementById('btn-setting').addEventListener('pointerdown', () => modalSetting.classList.remove('hidden'));
  document.getElementById('btn-close-setting').addEventListener('pointerdown', () => modalSetting.classList.add('hidden'));
  
  document.getElementById('setting-timer').addEventListener('input', (e) => {
    document.getElementById('timer-val').innerText = e.target.value;
  });
  
  document.getElementById('setting-stage').addEventListener('input', (e) => {
    document.getElementById('stage-val').innerText = e.target.value;
  });
  
  const stars = document.querySelectorAll('.star-rating .star');
  const diffInput = document.getElementById('setting-diff');
  stars.forEach(star => {
    star.addEventListener('pointerdown', (e) => {
      let val = parseInt(e.target.dataset.val);
      diffInput.value = val;
      stars.forEach(s => {
        if (parseInt(s.dataset.val) <= val) s.classList.add('active');
        else s.classList.remove('active');
      });
    });
  });
  
  document.getElementById('btn-save-setting').addEventListener('pointerdown', () => {
    window.GameConfig.timer = parseInt(document.getElementById('setting-timer').value);
    window.GameConfig.maxStage = parseInt(document.getElementById('setting-stage').value);
    window.GameConfig.diff = parseInt(document.getElementById('setting-diff').value);
    window.GameConfig.smooth = document.getElementById('setting-smooth').checked;
    
    const selectedRadio = document.querySelector('input[name="enemy-hp-view"]:checked');
    window.GameConfig.enemyHpView = selectedRadio ? selectedRadio.value : 'angka';
    
    modalSetting.classList.add('hidden');
    window.CustomDialog.alert("Konfigurasi berhasil diterapkan!", "BERHASIL");
  });
  
  document.getElementById('btn-fullscreen').addEventListener('pointerdown', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(err => console.log(err));
    else document.exitFullscreen();
  });
  
  document.getElementById('btn-start-game').addEventListener('pointerdown', () => {
    const p1Name = document.getElementById('p1-name').value.trim() || 'PLAYER 1';
    const p2Name = document.getElementById('p2-name').value.trim() || 'PLAYER 2';
    
    document.querySelector('.p1-tag-name').innerText = p1Name;
    document.querySelector('.p2-tag-name').innerText = p2Name;
    
    switchScreen('game');
    if (typeof initGame === 'function') initGame(p1Name, p2Name);
  });
});