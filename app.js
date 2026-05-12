// app.js - Navigasi, Konfigurasi UI, dan Sistem Anti-Gestur

window.GameConfig = { timer: 2, diff: 3, smooth: false };

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

// -- FUNGSI LEADERBOARD --
function loadLeaderboard() {
  let lbData = JSON.parse(localStorage.getItem('logicGameLB') || '[]');
  let ul = document.getElementById('leaderboard-list');
  ul.innerHTML = '';
  
  if (lbData.length === 0) {
    ul.innerHTML = '<li style="text-align:center; color:#aaa; font-size:0.7rem; padding:10px;">Belum ada data bertarung.</li>';
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
  // PENCEGAH GESTUR SISTEM OPERASI (Swipe to back, Pull to refresh, Double tap zoom)
  document.addEventListener('contextmenu', event => event.preventDefault());
  document.addEventListener('gesturestart', event => event.preventDefault());
  
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function(event) {
    let now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) event.preventDefault();
    lastTouchEnd = now;
  }, false);
  
  document.addEventListener('touchmove', function(e) {
    // Izinkan scroll khusus pada overlay tas, leaderboard, dll.
    if (e.target.closest('.inv-overlay') || e.target.closest('.accordion-body') ||
      e.target.closest('.modal-content') || e.target.closest('#leaderboard-panel')) {
      return;
    }
    e.preventDefault();
  }, { passive: false });
  
  const screens = {
    title: document.getElementById('screen-title'),
    menu: document.getElementById('screen-menu'),
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
  document.getElementById('btn-configure').addEventListener('pointerdown', () => switchScreen('gameSetup'));
  
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
  
  document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
      if (e.target.closest('#screen-game')) {
        window.CustomDialog.confirm("Keluar dari game? Progress tidak akan disimpan.", "KELUAR?", () => {
          if (window.gameInterval) clearInterval(window.gameInterval);
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
    window.GameConfig.diff = parseInt(document.getElementById('setting-diff').value);
    window.GameConfig.smooth = document.getElementById('setting-smooth').checked;
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