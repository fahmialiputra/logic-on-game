// gameRendering.js - Pengelolaan Visual, Status Bar UI, dan Partikel

function getMaxHpCap() {
  let diff = window.GameConfig.diff || 3;
  if (diff > 4) return 200;
  if (diff > 2) return 500;
  return 1000;
}

function showToast(playerObj, title, message) {
  let toast = document.getElementById(`toast-p${playerObj}`);
  if (!toast) return;
  document.getElementById(`toast-p${playerObj}-title`).innerText = title + ":";
  document.getElementById(`toast-p${playerObj}-msg`).innerText = message;
  
  toast.classList.remove('hidden');
  if (toast.timeoutId) clearTimeout(toast.timeoutId);
  toast.timeoutId = setTimeout(() => { toast.classList.add('hidden'); }, 2000);
}

function triggerEffect(playerObj, type) {
  let screen = document.getElementById(`p${playerObj}-screen`);
  if (!screen) return;
  screen.classList.remove('effect-damage', 'effect-heal', 'effect-buff', 'effect-attack');
  void screen.offsetWidth;
  screen.classList.add(`effect-${type}`);
  setTimeout(() => { screen.classList.remove(`effect-${type}`); }, 400);
}

function addVisualEffect(state, x, y, emoji, type = 'normal') {
  state.effects.push({ x: x, y: y, emoji: emoji, life: 1.0, type: type });
}

function updateStatsUI(playerObj) {
  let state = playerObj == 1 ? window.p1State : window.p2State;
  
  let baseFill = document.getElementById(`p${playerObj}-hp-fill-base`);
  let overFill = document.getElementById(`p${playerObj}-hp-fill-over`);
  if (baseFill && overFill) {
      // Warna Lapis HP 
      let hpColors = [
          'linear-gradient(90deg, #e74c3c, #c0392b)', // 0-100 (Red)
          'linear-gradient(90deg, #e67e22, #d35400)', // 101-200 (Orange)
          'linear-gradient(90deg, #f1c40f, #f39c12)', // 201-300 (Yellow)
          'linear-gradient(90deg, #2ecc71, #27ae60)', // 301-400 (Green)
          'linear-gradient(90deg, #3498db, #2980b9)', // 401-500 (Blue)
          'linear-gradient(90deg, #9b59b6, #8e44ad)', // 501-600 (Purple)
          'linear-gradient(90deg, #ff9ff3, #feca57)'  // 600+ (Pink/Gold)
      ];
      
      let maxLayer = hpColors.length - 1;
      let currentLayer = Math.max(0, Math.ceil(state.hp / 100) - 1);
      let prevLayer = Math.max(0, currentLayer - 1);
      
      let fgColor = hpColors[Math.min(currentLayer, maxLayer)];
      let bgColor = currentLayer > 0 ? hpColors[Math.min(prevLayer, maxLayer)] : '#8b0000';
      
      let pct = state.hp % 100;
      if (state.hp > 0 && pct === 0) pct = 100; // Layar Penuh pada ujung lapisan
      if (state.hp <= 0) pct = 0;

      baseFill.style.width = '100%';
      baseFill.style.background = bgColor;
      
      overFill.style.width = pct + '%';
      overFill.style.background = fgColor;
      overFill.style.opacity = '1';
  }
  
  document.getElementById(`p${playerObj}-hp`).innerText = state.hp;
  document.getElementById(`p${playerObj}-shield`).innerText = state.shield;
  document.getElementById(`p${playerObj}-atk`).innerText = state.atk;
  document.getElementById(`p${playerObj}-def`).innerText = state.def;
  document.getElementById(`p${playerObj}-stage`).innerText = state.stage;
  document.getElementById(`p${playerObj}-score`).innerText = state.score;
  
  let hd = document.getElementById(`header-p${playerObj}-stage`);
  if (hd) hd.innerText = `[St.${state.stage}]`;
  
  let buffHTML = state.activeBuffs.map((b, i) => {
    let pct = (b.timeLeft / b.maxTime) * 100;
    return `<div class="buff-indicator" id="buff-p${playerObj}-${b.id}-${i}" style="--pct: ${pct}%" title="${b.name}"><span>${b.emoji}</span></div>`;
  }).join('');
  document.getElementById(`p${playerObj}-buffs`).innerHTML = buffHTML || '-';
  
  let invContainer = document.getElementById(`inv-list-p${playerObj}`);
  invContainer.innerHTML = '';
  
  if (state.inventory.length === 0) {
    invContainer.innerHTML = '<p style="color:#aaa; width:100%; text-align:center;">Tas Kosong</p>';
  } else {
    state.inventory.forEach((itemId, index) => {
      let btn = document.createElement('button');
      btn.className = 'inv-item-btn action-use-item';
      btn.dataset.player = playerObj;
      btn.dataset.index = index;
      
      if (itemId === 'key') {
        btn.innerHTML = `🔑<br><small>Kunci Keluar</small>`;
      } else {
        let d = window.ITEM_DB[itemId];
        btn.innerHTML = `${d.emoji}<br><small>${d.name}</small>`;
        
        if (state.isPaused && state.hp === 1 && (d.type === 'heal' || d.type === 'shield')) {
          btn.classList.add('highlight-heal');
        }
      }
      invContainer.appendChild(btn);
    });
  }
}

function drawGame() {
  let ctx1 = document.getElementById('canvas-p1').getContext('2d');
  let ctx2 = document.getElementById('canvas-p2').getContext('2d');
  
  renderMaze(ctx1, window.p1State.maze, window.p1State.width, window.p1State.height, window.p1State.theme, window.p1State);
  if (window.GameConfig.players > 1) {
    renderMaze(ctx2, window.p2State.maze, window.p2State.width, window.p2State.height, window.p2State.theme, window.p2State);
  }
}