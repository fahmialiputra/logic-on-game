/**
 * Butuh perbaikan untuk penggunaan kontrol keyboard / gamepad fisik
 * agar dapat kembali berfungsi untuk menggerakan karakter setelah keluar dari overlay inventory
 */


window.GameAssets = {
  images: {},
  placeholders: {
    player1: 'assets/img/p1.png', player2: 'assets/img/p2.png', dead: 'assets/img/dead.png',
    enemy_dark: 'assets/img/vampire.png', enemy_beast: 'assets/img/werewolf.png', enemy_boss: 'assets/img/boss.png',
    door_closed: 'assets/img/door_closed.png', door_open: 'assets/img/door_open.png', key: 'assets/img/key.png',
    item_10: 'assets/img/item10.png', item_11: 'assets/img/item11.png', item_19: 'assets/img/item19.png'
  },
  loadedCount: 0, totalCount: 0,
  
  init: function(onComplete) {
    this.totalCount = Object.keys(this.placeholders).length;
    if (this.totalCount === 0) return onComplete();
    
    for (let key in this.placeholders) {
      let img = new Image();
      
      img.onload = () => { 
          this.images[key] = img; 
          this.checkComplete(onComplete); 
      };
      
      img.onerror = () => { 
          console.warn(`Aset gagal dimuat: ${key}. Menggunakan fallback emoji.`);
          this.checkComplete(onComplete); 
      };
      
      img.src = this.placeholders[key];
    }
  },
  
  checkComplete: function(onComplete) {
    this.loadedCount++;
    let pct = Math.floor((this.loadedCount / this.totalCount) * 100);
    let textEl = document.getElementById('loading-text');
    if (textEl) textEl.innerText = `${pct}%`;
    if (this.loadedCount >= this.totalCount) setTimeout(onComplete, 300);
  }
};

window.GameConfig = { 
    timer: 2, diff: 3, smooth: true, enemyHpView: 'bar', mode: 'time-trial', 
    maxStage: 5, players: 2, orientation: 'auto', endlessLimitEnabled: true, endlessLimit: 1, 
    bossInterval: 10, 
    inputP1: 'keyboard', inputP2: 'touch', 
    apiUrl: "https://script.google.com/macros/s/AKfycbyPk0c9xaWLfc6V2LYuRqUthm9fCtLO6Cm8ZXd16Uh1XgEUxsRJ0dm8OJhfDrxZF1E/exec" 
};

window.CustomDialog = {
  show: function(title, message, buttons) {
    const modal = document.getElementById('custom-modal');
    if(!modal) return;
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

window.updateGamepadUI = function() {
    let gps = navigator.getGamepads ? navigator.getGamepads() : [];
    let p1Select = document.getElementById('gp-select-p1');
    let p2Select = document.getElementById('gp-select-p2');
    if(!p1Select || !p2Select) return;

    let p1Val = window.GameConfig.gamepadP1 || 'auto';
    let p2Val = window.GameConfig.gamepadP2 || 'auto';

    p1Select.innerHTML = '<option value="auto">Auto / Keyboard</option>';
    p2Select.innerHTML = '<option value="auto">Auto / Keyboard</option>';

    for(let i = 0; i < gps.length; i++) {
        if(gps[i]) {
            let name = gps[i].id.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 15) + "...";
            p1Select.innerHTML += `<option value="${i}">[Port ${i}] ${name}</option>`;
            p2Select.innerHTML += `<option value="${i}">[Port ${i}] ${name}</option>`;
        }
    }
    
    p1Select.value = p1Val; if(!p1Select.value) p1Select.value = 'auto';
    p2Select.value = p2Val; if(!p2Select.value) p2Select.value = 'auto';
};

window.addEventListener("gamepadconnected", window.updateGamepadUI);
window.addEventListener("gamepaddisconnected", window.updateGamepadUI);

function updateBossIntervalUI(diff) {
    let bossInput = document.getElementById('setting-boss-interval');
    let bossVal = document.getElementById('boss-interval-val');
    if(!bossInput) return;
    
    let min = 3, max = 20;
    if (diff === 1) { max = 20; }
    else if (diff === 2) { max = 15; }
    else if (diff === 3) { max = 12; }
    else if (diff === 4) { max = 8; }
    else if (diff === 5) { max = 5; }
    
    bossInput.min = min;
    bossInput.max = max;
    
    let currentVal = parseInt(bossInput.value);
    if (currentVal < min) bossInput.value = min;
    if (currentVal > max) bossInput.value = max;
    
    if(bossVal) bossVal.innerText = bossInput.value;
    window.GameConfig.bossInterval = parseInt(bossInput.value);
}

async function loadLeaderboard() {
  let ul = document.getElementById('leaderboard-list');
  if(!ul) return;
  ul.innerHTML = '<li><span style="color:#aaa; font-size: 0.6rem;">Sinkronisasi data API...</span></li>';
  let lbData = [];
  
  if (window.GameConfig.apiUrl && window.GameConfig.apiUrl.trim() !== "") {
      try {
          let res = await fetch(window.GameConfig.apiUrl);
          let result = await res.json();
          if (result.status === 'success') lbData = result.data;
      } catch(e) {
          console.error("Gagal sinkronisasi data dari Sheets API.", e);
          lbData = JSON.parse(localStorage.getItem('logicGameLB') || '[]');
      }
  } else {
      lbData = JSON.parse(localStorage.getItem('logicGameLB') || '[]');
  }

  ul.innerHTML = '';
  if (lbData.length === 0) {
    ul.innerHTML = '<li style="text-align:center; color:#aaa; font-size:0.7rem; padding:10px;">Belum ada data.</li>';
    return;
  }
  
  lbData.sort((a, b) => b.score - a.score).slice(0, 5).forEach((entry, i) => {
    let li = document.createElement('li');
    li.className = 'lb-item';
    let displayStage = entry.stageInfo || entry.stage;
    li.innerHTML = `<span>#${i+1} ${entry.name}</span> <span>${displayStage} | ${entry.score} pts</span>`;
    ul.appendChild(li);
  });
}

const inputIcons = { 'keyboard': '⌨️', 'touch': '📱', 'gamepad': '🎮' };
const inputCycle = ['keyboard', 'touch', 'gamepad'];

window.syncInputIcons = function() {
    let btn1 = document.getElementById('toggle-input-p1');
    let btn2 = document.getElementById('toggle-input-p2');
    if(btn1) btn1.innerText = inputIcons[window.GameConfig.inputP1] || '⌨️';
    if(btn2) btn2.innerText = inputIcons[window.GameConfig.inputP2] || '📱';
    
    let sel1 = document.getElementById('input-select-p1');
    let sel2 = document.getElementById('input-select-p2');
    if(sel1) sel1.value = window.GameConfig.inputP1;
    if(sel2) sel2.value = window.GameConfig.inputP2;
};

window.cycleInputMode = function(p) {
    let currentMode = p == 1 ? window.GameConfig.inputP1 : window.GameConfig.inputP2;
    let nextIdx = (inputCycle.indexOf(currentMode) + 1) % inputCycle.length;
    let nextMode = inputCycle[nextIdx];
    
    if (p == 1) window.GameConfig.inputP1 = nextMode;
    else window.GameConfig.inputP2 = nextMode;
    
    window.syncInputIcons();
    if (typeof showToast === 'function') showToast(p, "KONTROL", `Diubah ke ${nextMode.toUpperCase()}`);
};

document.addEventListener('DOMContentLoaded', () => {
  window.GameAssets.init(() => {
    document.getElementById('screen-loading')?.classList.add('hidden');
    document.getElementById('screen-title')?.classList.remove('hidden');
  });

  window.updateGamepadUI();
  window.syncInputIcons();

  document.getElementById('toggle-input-p1')?.addEventListener('pointerdown', () => window.cycleInputMode(1));
  document.getElementById('toggle-input-p2')?.addEventListener('pointerdown', () => window.cycleInputMode(2));

  document.getElementById('btn-exit')?.addEventListener('pointerdown', () => {
      window.CustomDialog.confirm("Apakah Anda yakin ingin menutup game?", "KELUAR GAME", () => {
          window.close();
          setTimeout(() => {
              window.CustomDialog.alert("Browser mencegah penutupan otomatis. Silakan tutup tab ini secara manual.", "INFO");
          }, 500);
      });
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
    if (e.target.closest('.inv-grid') || e.target.closest('.inv-overlay') || e.target.closest('.accordion-body') ||
      e.target.closest('.modal-content') || e.target.closest('#leaderboard-panel') ||
      e.target.closest('.mode-options') || e.target.closest('.radio-pills') || e.target.closest('.setting-grid')) {
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
    Object.values(screens).forEach(screen => {
        if(screen) screen.classList.add('hidden');
    });
    if(screens[targetId]) screens[targetId].classList.remove('hidden');
  }

  screens.title?.addEventListener('pointerdown', () => switchScreen('menu'));
  document.getElementById('btn-review')?.addEventListener('pointerdown', () => switchScreen('review'));
  document.getElementById('btn-play')?.addEventListener('pointerdown', () => switchScreen('modeSelect'));
  
  document.getElementById('btn-next-setup')?.addEventListener('pointerdown', () => {
    const selMode = document.querySelector('input[name="game-mode"]:checked');
    window.GameConfig.mode = selMode ? selMode.value : 'time-trial';
    
    const selPlayers = document.querySelector('input[name="player-count"]:checked');
    window.GameConfig.players = selPlayers ? parseInt(selPlayers.value) : 2;
    
    let p2Group = document.getElementById('p2-input-group');
    if(p2Group) {
        if (window.GameConfig.players === 1) p2Group.classList.add('hidden');
        else p2Group.classList.remove('hidden');
    }
    switchScreen('gameSetup');
  });

  document.getElementById('btn-leaderboard')?.addEventListener('pointerdown', () => {
    const panel = document.getElementById('leaderboard-panel');
    if(!panel) return;
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) loadLeaderboard();
  });

  document.getElementById('btn-reset-game')?.addEventListener('pointerdown', () => {
    window.CustomDialog.confirm("Hapus seluruh data Leaderboard secara permanen?", "HAPUS DATA", () => {
      localStorage.removeItem('logicGameLB');
      loadLeaderboard();
      window.CustomDialog.alert("Data Leaderboard berhasil dihapus.", "BERHASIL");
    });
  });

  document.getElementById('btn-home-gameover')?.addEventListener('pointerdown', () => {
    switchScreen('menu');
    document.getElementById('leaderboard-panel')?.classList.add('hidden');
  });

  document.querySelectorAll('.btn-back, .btn-back-slim').forEach(btn => {
      btn.addEventListener('pointerdown', (e) => {
        if (e.target.closest('#screen-game')) {
          window.CustomDialog.confirm("Keluar dari game? Progress tidak akan disimpan.", "KELUAR?", () => {
            window.isGameActive = false;
            if (window.gameInterval) { clearInterval(window.gameInterval); window.gameInterval = null; }
            if (window.deathTimeout) { clearTimeout(window.deathTimeout); window.deathTimeout = null; }
            
            document.getElementById('dead-overlay-p1')?.classList.add('hidden');
            document.getElementById('dead-overlay-p2')?.classList.add('hidden');
            document.getElementById('inv-p1')?.classList.add('hidden');
            document.getElementById('inv-p2')?.classList.add('hidden');
            
            document.getElementById('upgrade-overlay-p1')?.classList.add('hidden');
            document.getElementById('upgrade-overlay-p2')?.classList.add('hidden');
            
            document.getElementById('resurrect-overlay-p1')?.classList.add('hidden');
            document.getElementById('resurrect-overlay-p2')?.classList.add('hidden');
            
            switchScreen('menu');
          });
        } else switchScreen('menu');
      });
  });

  const modalSetting = document.getElementById('modal-setting');
  document.getElementById('btn-setting')?.addEventListener('pointerdown', () => modalSetting?.classList.remove('hidden'));
  document.getElementById('btn-close-setting')?.addEventListener('pointerdown', () => modalSetting?.classList.add('hidden'));
  
  document.getElementById('setting-timer')?.addEventListener('input', (e) => { 
      let el = document.getElementById('timer-val');
      if(el) el.innerText = e.target.value; 
  });
  
  document.getElementById('setting-stage')?.addEventListener('input', (e) => { 
      let el = document.getElementById('stage-val');
      if(el) el.innerText = e.target.value; 
  });
  
  document.getElementById('setting-boss-interval')?.addEventListener('input', (e) => {
      let el = document.getElementById('boss-interval-val');
      if(el) el.innerText = e.target.value;
      window.GameConfig.bossInterval = parseInt(e.target.value);
  });
  
  const stars = document.querySelectorAll('.star-rating .star');
  const diffInput = document.getElementById('setting-diff');
  stars.forEach(star => {
      star.addEventListener('pointerdown', (e) => {
          let val = parseInt(e.target.dataset.val);
          if(diffInput) diffInput.value = val;
          stars.forEach(s => {
              if (parseInt(s.dataset.val) <= val) s.classList.add('active');
              else s.classList.remove('active');
          });
          updateBossIntervalUI(val);
      });
  });

  document.getElementById('setting-endless-limit-val')?.addEventListener('input', (e) => { 
      let el = document.getElementById('endless-limit-val');
      if(el) el.innerText = e.target.value; 
  });

  document.getElementById('btn-save-setting')?.addEventListener('pointerdown', () => {
    let tVal = document.getElementById('setting-timer');
    if(tVal) window.GameConfig.timer = parseInt(tVal.value);
    
    let sVal = document.getElementById('setting-stage');
    if(sVal) window.GameConfig.maxStage = parseInt(sVal.value);
    
    let dVal = document.getElementById('setting-diff');
    if(dVal) window.GameConfig.diff = parseInt(dVal.value);
    
    let smVal = document.getElementById('setting-smooth');
    if(smVal) window.GameConfig.smooth = smVal.checked;
    
    const selectedRadio = document.querySelector('input[name="enemy-hp-view"]:checked');
    window.GameConfig.enemyHpView = selectedRadio ? selectedRadio.value : 'angka';
    
    const orientRadio = document.querySelector('input[name="setting-orientation"]:checked');
    window.GameConfig.orientation = orientRadio ? orientRadio.value : 'auto';
    
    let limitEndless = document.getElementById('setting-limit-endless');
    if(limitEndless) window.GameConfig.endlessLimitEnabled = limitEndless.checked;
    
    let limitVal = document.getElementById('setting-endless-limit-val');
    if(limitVal) window.GameConfig.endlessLimit = parseInt(limitVal.value);

    let inP1 = document.getElementById('input-select-p1');
    if(inP1) window.GameConfig.inputP1 = inP1.value;
    let inP2 = document.getElementById('input-select-p2');
    if(inP2) window.GameConfig.inputP2 = inP2.value;
    
    window.syncInputIcons();
    
    const modalSetting = document.getElementById('modal-setting');
    modalSetting?.classList.add('hidden');
    window.CustomDialog.alert("Konfigurasi berhasil diterapkan!", "BERHASIL");
  });

  document.getElementById('btn-fullscreen')?.addEventListener('pointerdown', () => {
    let btn = document.getElementById('btn-fullscreen');
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.log(err));
        btn.innerHTML = '🗗';
    } else {
        document.exitFullscreen();
        btn.innerHTML = '🔲';
    }
  });

  document.getElementById('btn-start-game')?.addEventListener('pointerdown', async () => {
    let p1In = document.getElementById('p1-name');
    let p2In = document.getElementById('p2-name');
    
    const p1Name = (p1In ? p1In.value.trim() : '') || 'PLAYER 1';
    const p2Name = (p2In ? p2In.value.trim() : '') || 'PLAYER 2';
    
    const p1Tag = document.querySelector('.p1-tag-name');
    if (p1Tag) p1Tag.innerText = p1Name;
    
    const p2Tag = document.querySelector('.p2-tag-name');
    if (p2Tag) p2Tag.innerText = p2Name;
    
    let orient = window.GameConfig.orientation;
    if (orient && orient !== 'auto') {
      try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock(orient === 'portrait' ? 'portrait-primary' : 'landscape-primary');
        }
      } catch (err) { console.log("Device menolak Screen Lock otomatis.", err); }
    } else {
      if (screen.orientation && screen.orientation.unlock) {
        try { screen.orientation.unlock(); } catch (e) {}
      }
    }
    
    switchScreen('game');
    if (typeof initGame === 'function') initGame(p1Name, p2Name);
  });

  document.querySelectorAll('.btn-close-upgrade').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
      let p = e.target.dataset.player;
      let overlay = document.getElementById(`upgrade-overlay-p${p}`);
      if (overlay) overlay.classList.add('hidden');
      
      let state = p == 1 ? window.p1State : window.p2State;
      if (state) state.isPaused = false;
    });
  });

  document.getElementById('btn-restart-p1')?.addEventListener('pointerdown', () => {
    if (typeof window.resetPlayerEndless === 'function') window.resetPlayerEndless(1);
  });
  
  document.getElementById('btn-restart-p2')?.addEventListener('pointerdown', () => {
    if (typeof window.resetPlayerEndless === 'function') window.resetPlayerEndless(2);
  });

  [1, 2].forEach(p => {
    document.getElementById(`btn-resurrect-yes-p${p}`)?.addEventListener('pointerdown', () => {
      if (typeof window[`resurrectActionYes${p}`] === 'function') window[`resurrectActionYes${p}`]();
    });
    document.getElementById(`btn-resurrect-no-p${p}`)?.addEventListener('pointerdown', () => {
      if (typeof window[`resurrectActionNo${p}`] === 'function') window[`resurrectActionNo${p}`]();
    });
  });
});