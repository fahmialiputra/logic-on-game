// app.js - Navigasi dan Konfigurasi UI
window.GameConfig = { timer: 2, diff: 3 };

window.CustomDialog = {
  show: function(title, message, buttons) {
    const modal = document.getElementById('custom-modal');
    document.getElementById('custom-modal-title').innerText = title;
    document.getElementById('custom-modal-message').innerText = message;
    
    const btnContainer = document.getElementById('custom-modal-buttons');
    btnContainer.innerHTML = '';
    
    buttons.forEach(btnInfo => {
      const btn = document.createElement('button');
      btn.className = `btn-modal ${btnInfo.class || ''}`;
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

document.addEventListener('DOMContentLoaded', () => {
  const screens = {
    title: document.getElementById('screen-title'),
    menu: document.getElementById('screen-menu'),
    review: document.getElementById('screen-review'),
    gameSetup: document.getElementById('screen-game-setup'),
    game: document.getElementById('screen-game')
  };
  
  function switchScreen(targetId) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[targetId].classList.remove('hidden');
  }
  
  screens.title.addEventListener('pointerdown', () => switchScreen('menu'));
  document.getElementById('btn-review').addEventListener('pointerdown', () => switchScreen('review'));
  document.getElementById('btn-configure').addEventListener('pointerdown', () => switchScreen('gameSetup'));
  
  document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
      if (e.target.closest('#screen-game')) {
        window.CustomDialog.confirm("Keluar dari game? Progress akan hilang.", "KELUAR?", () => {
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
  
  // Logika Interaksi Star Rating
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
    modalSetting.classList.add('hidden');
    window.CustomDialog.alert("Konfigurasi berhasil diterapkan!", "BERHASIL");
  });
  
  document.getElementById('btn-fullscreen').addEventListener('pointerdown', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(err => console.log(err));
    else document.exitFullscreen();
  });
  
  document.getElementById('btn-start-game').addEventListener('pointerdown', () => {
    const p1 = document.getElementById('p1-name').value || 'P1';
    const p2 = document.getElementById('p2-name').value || 'P2';
    switchScreen('game');
    if (typeof initGame === 'function') initGame(p1, p2);
  });
});