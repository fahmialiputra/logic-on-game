// gameLogic.js - RPG Stats, Ambil/Gunakan Interaksi, & Fix Render
let p1State = {};
let p2State = {};
window.gameInterval = null;
window.isGameActive = false;

function populateEntities(state) {
    state.monsters = {};
    let emptyCells = [];
    
    // Titik Krusial yang TIDAK BOLEH ditimpa monster / item
    let startCoord = {x: 1, y: 1};
    let keyCoord = {x: 1, y: state.size - 2};
    let exitCoord = {x: state.size - 2, y: state.size - 2};

    for(let y=1; y<state.size-1; y++) {
        for(let x=1; x<state.size-1; x++) {
            if(state.maze[y][x] === 0) {
                // PERBAIKAN 2: Mencegah penempatan item/monster di jalur lahir, kunci, dan pintu
                if ((x === startCoord.x && y === startCoord.y) || 
                    (x === keyCoord.x && y === keyCoord.y) || 
                    (x === exitCoord.x && y === exitCoord.y)) {
                    continue;
                }
                emptyCells.push({x, y});
            }
        }
    }
    emptyCells.sort(() => Math.random() - 0.5); // Acak posisi
    
    let diff = window.GameConfig ? (window.GameConfig.diff || 3) : 3;
    
    // Penyesuaian agar permainan dapat diselesaikan (Solvable Balancing)
    // - Semakin tinggi diff: Pedang/Obor jadi barang mewah, namun Apel (Heal) diperbanyak untuk mengimbangi jumlah musuh.
    let swordCount = Math.max(1, Math.floor((6 - diff) / 1.5)); 
    let torchCount = Math.max(1, Math.floor((6 - diff) / 2));
    let appleCount = diff + 2; 

    for(let i=0; i<swordCount; i++) { if(emptyCells.length > 0) { let c = emptyCells.pop(); state.maze[c.y][c.x] = 5; } }
    for(let i=0; i<torchCount; i++) { if(emptyCells.length > 0) { let c = emptyCells.pop(); state.maze[c.y][c.x] = 6; } }
    for(let i=0; i<appleCount; i++) { if(emptyCells.length > 0) { let c = emptyCells.pop(); state.maze[c.y][c.x] = 7; } }
    
    let monsterCount = Math.floor(state.size / 3) + (diff - 1); 
    for(let i=0; i < monsterCount; i++) {
        if(emptyCells.length > 0) {
            let cell = emptyCells.pop();
            state.maze[cell.y][cell.x] = 4; // Monster
            let isDark = Math.random() > 0.5;
            
            // Rumus scalling Atribut agar masuk akal dan adil bagi pemain pemula
            let vHp = 20 + (diff * 5);
            let vAtk = 10 + (diff * 2);
            let vDef = Math.floor(diff / 2);
            
            let wHp = 15 + (diff * 5);
            let wAtk = 8 + (diff * 2);
            let wDef = Math.floor(diff / 2) + 1;

            state.monsters[`${cell.x},${cell.y}`] = isDark ? 
                 { type: 'dark', emoji: '🧛', hp: vHp, atk: vAtk, def: vDef, name: 'Vampire' } : 
                 { type: 'beast', emoji: '🐺', hp: wHp, atk: wAtk, def: wDef, name: 'Werewolf' };
        }
    }
}

function initGame(p1Name, p2Name) {
    let diff = window.GameConfig.diff || 3;
    let size = 11 + ((diff - 1) * 2); 
    
    const baseState = () => ({ x: 1, y: 1, hasKey: false, hasTorchBuff: false, inventory: [], score: 0, hp: 100, atk: 15, def: 5, stage: 1, size: size });
    
    p1State = { ...baseState(), id: 1, theme: 'ruins', maze: generateMaze(size, size) };
    p2State = { ...baseState(), id: 2, theme: 'jungle', maze: generateMaze(size, size) };
    
    populateEntities(p1State); populateEntities(p2State);
    updateStatsUI(1); updateStatsUI(2);
    
    // SISTEM TIMER
    clearInterval(window.gameInterval); 
    let timerMinutes = window.GameConfig.timer || 2;
    let timeRemaining = timerMinutes * 60; 
    window.isGameActive = true;
    
    const timerUI = document.getElementById('game-timer');
    function updateTimerUI() {
        let m = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
        let s = (timeRemaining % 60).toString().padStart(2, '0');
        timerUI.innerText = `${m}:${s}`;
    }
    
    updateTimerUI();
    window.gameInterval = setInterval(() => {
        if (!window.isGameActive) return;
        
        // Mematikan paksa timer jika berada di luar layar game (fallback keamanan)
        if (document.getElementById('screen-game').classList.contains('hidden')) {
            clearInterval(window.gameInterval);
            window.isGameActive = false;
            return;
        }

        timeRemaining--;
        updateTimerUI();

        if (timeRemaining <= 0) {
            clearInterval(window.gameInterval);
            window.isGameActive = false;
            window.CustomDialog.alert(
                `Waktu Habis!\n\nP1 Score: ${p1State.score}\nP2 Score: ${p2State.score}`, 
                "GAME OVER", 
                () => {
                    document.getElementById('screen-game').classList.add('hidden');
                    document.getElementById('screen-menu').classList.remove('hidden');
                }
            );
        }
    }, 1000);
    
    function resizeCanvas() {
        let canvas1 = document.getElementById('canvas-p1');
        let canvas2 = document.getElementById('canvas-p2');
        canvas1.width = canvas1.parentElement.clientWidth || 300;
        canvas1.height = canvas1.parentElement.clientHeight || 300;
        canvas2.width = canvas2.parentElement.clientWidth || 300;
        canvas2.height = canvas2.parentElement.clientHeight || 300;
        drawGame();
    }
    window.addEventListener('resize', resizeCanvas);
    setTimeout(resizeCanvas, 100); 
}

// Fungsi Notifikasi Independen Per Layar
function showPlayerModal(playerObj, title, message) {
    document.getElementById(`modal-p${playerObj}-title`).innerText = title;
    document.getElementById(`modal-p${playerObj}-message`).innerText = message;
    
    const modal = document.getElementById(`modal-p${playerObj}`);
    modal.classList.remove('hidden');
    
    const okBtn = document.getElementById(`btn-modal-p${playerObj}-ok`);
    let newBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newBtn, okBtn);
    newBtn.addEventListener('pointerdown', () => modal.classList.add('hidden'));
}

function updateStatsUI(playerObj) {
    let state = playerObj == 1 ? p1State : p2State;
    document.getElementById(`p${playerObj}-hp`).innerText = state.hp;
    document.getElementById(`p${playerObj}-atk`).innerText = state.atk;
    document.getElementById(`p${playerObj}-def`).innerText = state.def;
    document.getElementById(`p${playerObj}-score`).innerText = state.score;
    document.getElementById(`p${playerObj}-stage`).innerText = state.stage;
    
    let invContainer = document.getElementById(`inv-list-p${playerObj}`);
    invContainer.innerHTML = '';
    
    if (state.inventory.length === 0) {
        invContainer.innerHTML = '<p style="color:#aaa; font-size:0.8rem; width:100%; text-align:center;">Tas Kosong</p>';
    } else {
        state.inventory.forEach((item, index) => {
            let btn = document.createElement('button');
            btn.className = 'inv-item-btn action-use-item';
            btn.innerText = item;
            btn.dataset.player = playerObj;
            btn.dataset.index = index;
            invContainer.appendChild(btn);
        });
    }
}

function drawGame() {
    let ctx1 = document.getElementById('canvas-p1').getContext('2d');
    let ctx2 = document.getElementById('canvas-p2').getContext('2d');
    renderMaze(ctx1, p1State.maze, p1State.size, p1State.size, p1State.theme, p1State);
    renderMaze(ctx2, p2State.maze, p2State.size, p2State.size, p2State.theme, p2State);
}

function grabItem(playerObj) {
    let state = playerObj == 1 ? p1State : p2State;
    let currentCell = state.maze[state.y][state.x];
    if ([2, 5, 6, 7].includes(currentCell)) {
        if (currentCell === 2) { state.inventory.push('🔑'); state.hasKey = true; }
        else if (currentCell === 5) state.inventory.push('🗡️');
        else if (currentCell === 6) state.inventory.push('🕯️');
        else if (currentCell === 7) state.inventory.push('🍎');
        
        state.maze[state.y][state.x] = 0;
        state.score += 20;
        showPlayerModal(playerObj, "INFO AMBIL", "Barang berhasil dimasukkan ke tas!");
        updateStatsUI(playerObj); drawGame();
    } else {
        showPlayerModal(playerObj, "INFO", "Kamu tidak berdiri di atas barang.");
    }
}

function useItem(playerObj, itemIndex) {
    let state = playerObj == 1 ? p1State : p2State;
    let item = state.inventory[itemIndex];
    if (!item) return;
    
    let used = false;
    if (item === '🍎') {
        state.hp = Math.min(100, state.hp + 30);
        showPlayerModal(playerObj, "GUNAKAN ITEM", "Nyam! Makan Apel. HP +30.");
        used = true;
    } else if (item === '🗡️') {
        state.atk += 10;
        showPlayerModal(playerObj, "GUNAKAN ITEM", "Pedang dipakai! ATK +10.");
        used = true;
    } else if (item === '🕯️') {
        state.hasTorchBuff = true;
        showPlayerModal(playerObj, "GUNAKAN ITEM", "Obor menyala! Serangan tambahan vs Vampire.");
        used = true;
    } else if (item === '🔑') {
        showPlayerModal(playerObj, "INFO", "Kunci akan terpakai otomatis saat menyentuh pintu.");
    }
    
    if (used) {
        state.inventory.splice(itemIndex, 1);
        document.getElementById(`inv-p${playerObj}`).classList.add('hidden');
    }
    updateStatsUI(playerObj); drawGame();
}

function movePlayer(playerObj, dir) {
    let state = playerObj == 1 ? p1State : p2State;
    if (state.hp <= 0) return; 
    let nextX = state.x; let nextY = state.y;
    
    if (dir === 'up') nextY--;
    else if (dir === 'down') nextY++;
    else if (dir === 'left') nextX--;
    else if (dir === 'right') nextX++;
    
    if (nextX >= 0 && nextX < state.size && nextY >= 0 && nextY < state.size) {
        let targetCell = state.maze[nextY][nextX];
        if (targetCell !== 1) { 
            if (targetCell === 4) {
                let monster = state.monsters[`${nextX},${nextY}`];
                if(monster) {
                    let pAtk = state.atk; let mAtk = monster.atk;
                    if(monster.type === 'dark' && !state.hasTorchBuff) mAtk += 10; 
                    else if(monster.type === 'dark' && state.hasTorchBuff) pAtk += 15; 
                    
                    let dmgToMonster = Math.max(1, pAtk - monster.def);
                    let dmgToPlayer = Math.max(0, mAtk - state.def);
                    
                    monster.hp -= dmgToMonster;
                    if(monster.hp > 0) {
                        state.hp -= dmgToPlayer;
                    } else {
                        state.hp -= dmgToPlayer; 
                        state.maze[nextY][nextX] = 0; 
                        delete state.monsters[`${nextX},${nextY}`];
                        state.score += 100;
                        showPlayerModal(playerObj, "MENANG!", `${monster.name} berhasil dikalahkan!`);
                        state.x = nextX; state.y = nextY;
                    }
                    if(state.hp <= 0) {
                        state.hp = 0;
                        showPlayerModal(playerObj, "GAME OVER", `Kamu telah gugur dalam labirin.`);
                    }
                }
            } else if (targetCell === 3) {
                if (state.hasKey) {
                    showPlayerModal(playerObj, "STAGE CLEAR!", `Mantap! Lanjut ke stage berikutnya.`);
                    
                    state.score += 200;
                    state.stage += 1;
                    state.size += 2; 
                    state.maze = generateMaze(state.size, state.size);
                    state.x = 1; state.y = 1;
                    
                    let keyIdx = state.inventory.indexOf('🔑');
                    if (keyIdx > -1) state.inventory.splice(keyIdx, 1);
                    state.hasKey = false;
                    
                    populateEntities(state);
                } else {
                    showPlayerModal(playerObj, "TERKUNCI", "Pintu keluar butuh kunci emas 🔑.");
                }
            } else {
                state.x = nextX; state.y = nextY;
            }
        }
    }
    updateStatsUI(playerObj);
    requestAnimationFrame(drawGame);
}

// --- GLOBAL EVENT LISTENER UNTUK KONTROL ---
document.addEventListener('pointerdown', (e) => {
    if (!window.isGameActive) return;

    let btn = e.target.closest('.dpad-btn, .action-grab, .action-inv, .action-use-item');
    if (!btn) return;
    
    e.preventDefault();
    const player = btn.dataset.player;
    
    if (btn.classList.contains('action-grab')) {
        grabItem(player);
    } else if (btn.classList.contains('action-inv')) {
        document.getElementById(`inv-p${player}`).classList.toggle('hidden');
    } else if (btn.classList.contains('action-use-item')) {
        const itemIdx = btn.dataset.index;
        useItem(player, itemIdx);
    } else {
        const dir = btn.dataset.dir;
        if (player && dir) movePlayer(player, dir);
    }
});