// gameLogic.js - RPG Stats, Database Item, Spacing Algoritma, Durasi Buff, Toast & Combat AI

window.ITEM_DB = {
    // ATK BUFFS (ID 10-12)
    10: { name: 'Pedang Kayu', emoji: '🗡️', type: 'atk', val: 10, dur: 15 },
    11: { name: 'Dua Pedang', emoji: '⚔️', type: 'atk', val: 18, dur: 20 },
    12: { name: 'Pedang Emas', emoji: '🔱', type: 'atk', val: 30, dur: 25 },
    
    // UTILITY / ANTI-DARK (ID 13-15)
    13: { name: '3 Lilin', emoji: '🕯️', type: 'util', utilType: 'light', dur: 15 },
    14: { name: 'Obor', emoji: '🔥', type: 'util', utilType: 'light', dur: 25 },
    15: { name: 'Jubah Anti-Vampir', emoji: '🧥', type: 'util', utilType: 'light', defBonus: 5, dur: 30 },
    
    // DEF BUFFS (ID 16-18)
    16: { name: 'Perisai Kayu', emoji: '🪵', type: 'def', val: 5, dur: 15 },
    17: { name: 'Baju Armor', emoji: '🦺', type: 'def', val: 12, dur: 25 },
    18: { name: 'Perisai Besi', emoji: '🛡️', type: 'def', val: 20, dur: 30 },
    
    // HEALS (ID 19-23)
    19: { name: 'Apel', emoji: '🍎', type: 'heal', val: 20 },
    20: { name: 'Jus Buah', emoji: '🧃', type: 'heal', val: 35 },
    21: { name: 'Daging Sapi', emoji: '🥩', type: 'heal', val: 50 },
    22: { name: 'Daging Rusa', emoji: '🍗', type: 'heal', val: 75 },
    23: { name: 'Obat', emoji: '💊', type: 'heal', val: 100 }
};

let p1State = {}; let p2State = {};
let gameInterval;
let enemyInterval; // Interval khusus untuk pergerakan AI Musuh
window.isGameActive = false;

// Fungsi Menampilkan Notifikasi Toast
function showToast(playerObj, title, message) {
    let toast = document.getElementById(`toast-p${playerObj}`);
    document.getElementById(`toast-p${playerObj}-title`).innerText = title;
    document.getElementById(`toast-p${playerObj}-msg`).innerText = message;
    
    toast.classList.remove('hidden');
    if(toast.timeoutId) clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => { toast.classList.add('hidden'); }, 2500);
}

// Fungsi Memicu Efek Visual (Guncangan / Cahaya)
function triggerEffect(playerObj, type) {
    let screen = document.getElementById(`p${playerObj}-screen`);
    if(!screen) return;
    
    // Hapus kelas efek sebelumnya agar animasi bisa ter-reset jika terjadi beruntun
    screen.classList.remove('effect-damage', 'effect-heal', 'effect-buff', 'effect-attack');
    void screen.offsetWidth; // Memaksa perenderan ulang (reflow) DOM
    
    screen.classList.add(`effect-${type}`);
    setTimeout(() => { screen.classList.remove(`effect-${type}`); }, 400); // Bersihkan kelas
}

function populateEntities(state) {
    state.monsters = {};
    let emptyCells = [];
    
    for(let y=1; y<state.size-1; y++) {
        for(let x=1; x<state.size-1; x++) {
            if(state.maze[y][x] === 0 && !(x === 1 && y === 1)) emptyCells.push({x, y});
        }
    }
    emptyCells.sort(() => Math.random() - 0.5);
    
    let diff = window.GameConfig.diff || 3;
    
    let monsterCount = Math.floor(state.size / 4) + diff; 
    let safeDistFromPlayer = 4 + diff; 
    let safeDistBetweenMonsters = 3;   
    let placedMonsters = [];

    for(let i = emptyCells.length - 1; i >= 0 && placedMonsters.length < monsterCount; i--) {
        let cell = emptyCells[i];
        
        let distToPlayer = Math.abs(cell.x - 1) + Math.abs(cell.y - 1);
        if (distToPlayer < safeDistFromPlayer) continue;

        let isTooClose = placedMonsters.some(m => (Math.abs(m.x - cell.x) + Math.abs(m.y - cell.y)) < safeDistBetweenMonsters);
        if (isTooClose) continue;

        state.maze[cell.y][cell.x] = 4; 
        placedMonsters.push(cell);
        
        let isDark = Math.random() > 0.5;
        let hpScale = state.stage * 5; 
        let atkScale = state.stage * 2;
        
        state.monsters[`${cell.x},${cell.y}`] = isDark ? 
             { type: 'dark', emoji: '🧛', hp: 30+(diff*5)+hpScale, atk: 12+(diff*3)+atkScale, def: diff, name: 'Vampire' } : 
             { type: 'beast', emoji: '🐺', hp: 25+(diff*5)+hpScale, atk: 10+(diff*2)+atkScale, def: diff+2, name: 'Werewolf' };
             
        emptyCells.splice(i, 1);
    }
    
    let mapSizeMultiplier = Math.max(1, Math.floor(state.size / 10));
    let weaponCount = Math.max(1, 4 - Math.floor(diff / 2)) * mapSizeMultiplier;
    let utilCount = Math.max(1, 4 - Math.floor(diff / 2)) * mapSizeMultiplier;
    let healCount = Math.max(2, 7 - diff) * mapSizeMultiplier; 
    
    for(let i=0; i<healCount && emptyCells.length > 0; i++) {
        let c = emptyCells.pop();
        let id = diff >= 4 ? (19 + Math.floor(Math.random() * 2)) : (diff === 3 ? (19 + Math.floor(Math.random() * 3)) : (20 + Math.floor(Math.random() * 4)));
        state.maze[c.y][c.x] = id; 
    }
    
    for(let i=0; i<weaponCount && emptyCells.length > 0; i++) {
        let c = emptyCells.pop();
        state.maze[c.y][c.x] = 10 + Math.floor(Math.random() * 3);
    }
    
    for(let i=0; i<utilCount && emptyCells.length > 0; i++) {
        let c = emptyCells.pop();
        state.maze[c.y][c.x] = Math.random() > 0.5 ? 13 + Math.floor(Math.random() * 3) : 16 + Math.floor(Math.random() * 3);
    }
}

// LOGIKA AI MUSUH (Hanya aktif jika Diff > 3)
function processEnemyAI(playerObj, state) {
    if (state.hp <= 0) return false;
    
    let newMonsters = {};
    let playerAttacked = false;
    let changed = false; 
    
    for (let key in state.monsters) {
        let m = state.monsters[key];
        let [mx, my] = key.split(',').map(Number);
        
        // Cek Jarak (Manhattan Distance) ke Pemain
        let dist = Math.abs(state.x - mx) + Math.abs(state.y - my);
        
        if (dist === 1) { 
            // Aggro! Musuh berada di sebelah pemain, Musuh menyerang duluan
            let mAtk = m.atk;
            if(m.type === 'dark' && state.lightBuff === 0) mAtk += 15;
            let dmgToPlayer = Math.max(0, mAtk - state.def);
            
            state.hp -= dmgToPlayer;
            showToast(playerObj, "AWAS!", `Diserang ${m.emoji} -${dmgToPlayer} HP.`);
            triggerEffect(playerObj, 'damage');
            
            playerAttacked = true; changed = true;
            newMonsters[`${mx},${my}`] = m; // Musuh tetap di tempatnya saat menyerang
            
            if (state.hp <= 0) {
                state.hp = 0;
                window.CustomDialog.alert(`Player ${playerObj} tewas diserang ${m.name}.`, "GAME OVER");
                window.isGameActive = false;
                break;
            }
        } else if (dist <= 4 && dist > 1) { 
            // AI Mengejar Pemain Jika di area pantauan (Jarak 2-4)
            let dirs = [[0,-1], [0,1], [-1,0], [1,0]];
            
            // Urutkan gerakan berdasarkan yang paling mendekatkan ke pemain
            dirs.sort((a, b) => {
                let distA = Math.abs(state.x - (mx + a[0])) + Math.abs(state.y - (my + a[1]));
                let distB = Math.abs(state.x - (mx + b[0])) + Math.abs(state.y - (my + b[1]));
                return distA - distB; 
            });

            let moved = false;
            for (let d of dirs) {
                let nx = mx + d[0]; let ny = my + d[1];
                // Syarat gerak: Grid kosong (0) dan tidak ada monster lain di sana
                if (state.maze[ny][nx] === 0 && !newMonsters[`${nx},${ny}`]) {
                    state.maze[my][mx] = 0; 
                    state.maze[ny][nx] = 4;
                    newMonsters[`${nx},${ny}`] = m;
                    moved = true; changed = true;
                    break;
                }
            }
            if (!moved) newMonsters[`${mx},${my}`] = m; // Terjebak
        } else {
            // Pemain di luar area, musuh diam
            newMonsters[`${mx},${my}`] = m;
        }
    }
    state.monsters = newMonsters;
    if (playerAttacked) updateStatsUI(playerObj);
    return changed;
}

function initGame(p1Name, p2Name) {
    let diff = window.GameConfig.diff || 3;
    let size = 11 + ((diff - 1) * 2); 
    
    const baseState = () => ({ 
        x: 1, y: 1, hasKey: false, inventory: [], activeBuffs: [], lightBuff: 0, 
        score: 0, hp: 100, atk: 15, def: 5, stage: 1, size: size 
    });
    
    p1State = { ...baseState(), id: 1, theme: 'ruins', maze: generateMaze(size, size) };
    p2State = { ...baseState(), id: 2, theme: 'jungle', maze: generateMaze(size, size) };
    
    populateEntities(p1State); populateEntities(p2State);
    updateStatsUI(1); updateStatsUI(2);
    
    clearInterval(gameInterval); 
    clearInterval(enemyInterval);
    
    let timeRemaining = (window.GameConfig.timer || 2) * 60; 
    window.isGameActive = true;
    
    const timerUI = document.getElementById('game-timer');
    gameInterval = setInterval(() => {
        if (!window.isGameActive) return;
        timeRemaining--;
        let m = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
        let s = (timeRemaining % 60).toString().padStart(2, '0');
        timerUI.innerText = `${m}:${s}`;

        if (timeRemaining <= 0) {
            clearInterval(gameInterval); clearInterval(enemyInterval);
            window.isGameActive = false;
            window.CustomDialog.alert(`Waktu Habis!\nP1: ${p1State.score} | P2: ${p2State.score}`, "GAME OVER", () => {
                document.getElementById('screen-game').classList.add('hidden');
                document.getElementById('screen-menu').classList.remove('hidden');
            });
        }
    }, 1000);
    
    // Interval AI: Dijalankan setiap 1 detik jika Difficulty > 3
    enemyInterval = setInterval(() => {
        if (!window.isGameActive) return;
        if (diff > 3) {
            let redraw1 = processEnemyAI(1, p1State);
            let redraw2 = processEnemyAI(2, p2State);
            if (redraw1 || redraw2) requestAnimationFrame(drawGame);
        }
    }, 1000); 

    function resizeCanvas() {
        let canvas1 = document.getElementById('canvas-p1'); let canvas2 = document.getElementById('canvas-p2');
        canvas1.width = canvas1.parentElement.clientWidth || 300; canvas1.height = canvas1.parentElement.clientHeight || 300;
        canvas2.width = canvas2.parentElement.clientWidth || 300; canvas2.height = canvas2.parentElement.clientHeight || 300;
        drawGame();
    }
    window.addEventListener('resize', resizeCanvas); setTimeout(resizeCanvas, 100); 
}

function updateStatsUI(playerObj) {
    let state = playerObj == 1 ? p1State : p2State;
    document.getElementById(`p${playerObj}-hp`).innerText = state.hp;
    document.getElementById(`p${playerObj}-atk`).innerText = state.atk;
    document.getElementById(`p${playerObj}-def`).innerText = state.def;
    document.getElementById(`p${playerObj}-stage`).innerText = state.stage;
    document.getElementById(`p${playerObj}-score`).innerText = state.score;
    
    let buffStr = state.activeBuffs.map(b => b.emoji).join(' ');
    document.getElementById(`p${playerObj}-buffs`).innerText = buffStr || '-';
    
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
            
            if(itemId === 'key') btn.innerHTML = `🔑<br><small>Kunci Keluar</small>`;
            else {
                let d = window.ITEM_DB[itemId];
                btn.innerHTML = `${d.emoji}<br><small>${d.name}</small>`;
            }
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
    let cell = state.maze[state.y][state.x];
    
    if (cell === 2 || (cell >= 10 && cell <= 23)) {
        if(state.inventory.length >= 6) {
            showToast(playerObj, "TAS PENUH", "Maksimal 6 barang!"); return;
        }
        
        let itemName = "";
        if (cell === 2) { state.inventory.push('key'); state.hasKey = true; itemName = "Kunci Emas 🔑"; }
        else { 
            state.inventory.push(cell); 
            itemName = `${window.ITEM_DB[cell].emoji} ${window.ITEM_DB[cell].name}`;
        }
        
        state.maze[state.y][state.x] = 0; state.score += 15;
        showToast(playerObj, "AMBIL ITEM", `${itemName} masuk tas.`);
        updateStatsUI(playerObj); drawGame();
    } else {
        showToast(playerObj, "KOSONG", "Tidak ada item di bawahmu.");
    }
}

function useItem(playerObj, itemIndex) {
    let state = playerObj == 1 ? p1State : p2State;
    let itemId = state.inventory[itemIndex];
    if (!itemId) return;
    
    if (itemId === 'key') {
        showToast(playerObj, "INFO", "Tabrak pintu untuk pakai kunci otomatis."); return;
    }
    
    let item = window.ITEM_DB[itemId];
    state.inventory.splice(itemIndex, 1);
    document.getElementById(`inv-p${playerObj}`).classList.add('hidden'); 
    
    if(item.type === 'heal') {
        state.hp = Math.min(200, state.hp + item.val);
        triggerEffect(playerObj, 'heal'); // Panggil Efek Visual
        showToast(playerObj, "HEAL", `Gluk! +${item.val} HP.`);
    } else {
        let buffObj = { id: item.id, emoji: item.emoji };
        state.activeBuffs.push(buffObj);
        triggerEffect(playerObj, 'buff'); // Panggil Efek Visual
        
        if (item.type === 'atk') state.atk += item.val;
        if (item.type === 'def') state.def += item.val;
        if (item.type === 'util' && item.utilType === 'light') {
            state.lightBuff++;
            if(item.defBonus) state.def += item.defBonus;
        }
        
        showToast(playerObj, "BUFF AKTIF", `${item.name} aktif selama ${item.dur} detik!`);
        
        setTimeout(() => {
            if (item.type === 'atk') state.atk -= item.val;
            if (item.type === 'def') state.def -= item.val;
            if (item.type === 'util' && item.utilType === 'light') {
                state.lightBuff--;
                if(item.defBonus) state.def -= item.defBonus;
            }
            
            let idx = state.activeBuffs.indexOf(buffObj);
            if (idx > -1) state.activeBuffs.splice(idx, 1);
            showToast(playerObj, "BUFF HABIS", `Efek ${item.name} telah selesai.`);
            updateStatsUI(playerObj);
        }, item.dur * 1000);
    }
    updateStatsUI(playerObj); drawGame();
}

function movePlayer(playerObj, dir) {
    let state = playerObj == 1 ? p1State : p2State;
    if (state.hp <= 0 || !window.isGameActive) return; 
    let nextX = state.x; let nextY = state.y;
    
    if (dir === 'up') nextY--; else if (dir === 'down') nextY++;
    else if (dir === 'left') nextX--; else if (dir === 'right') nextX++;
    
    if (nextX >= 0 && nextX < state.size && nextY >= 0 && nextY < state.size) {
        let targetCell = state.maze[nextY][nextX];
        if (targetCell !== 1) { 
            if (targetCell === 4) {
                // Pemain Menyerang Monster Secara Manual (Bump)
                triggerEffect(playerObj, 'attack'); // Efek Animasi
                
                let monster = state.monsters[`${nextX},${nextY}`];
                if(monster) {
                    let pAtk = state.atk; let mAtk = monster.atk;
                    if(monster.type === 'dark' && state.lightBuff === 0) mAtk += 15; 
                    else if(monster.type === 'dark' && state.lightBuff > 0) pAtk += 20; 
                    
                    let dmgToMonster = Math.max(1, pAtk - monster.def);
                    let dmgToPlayer = Math.max(0, mAtk - state.def);
                    
                    monster.hp -= dmgToMonster;
                    
                    if(monster.hp > 0) {
                        state.hp -= dmgToPlayer;
                        // Serang Balik
                        triggerEffect(playerObj, 'damage');
                        showToast(playerObj, "BENTROK!", `Diserang balik! -${dmgToPlayer} HP.`);
                    } else {
                        state.hp -= dmgToPlayer; 
                        state.maze[nextY][nextX] = 0; 
                        delete state.monsters[`${nextX},${nextY}`];
                        state.score += 150;
                        showToast(playerObj, "MENANG!", `${monster.emoji} hancur!`);
                        state.x = nextX; state.y = nextY;
                    }
                    if(state.hp <= 0) {
                        state.hp = 0;
                        window.CustomDialog.alert(`Player ${playerObj} telah gugur dalam labirin.`, "MATI");
                        window.isGameActive = false;
                    }
                }
            } else if (targetCell === 3) {
                if (state.hasKey) {
                    showToast(playerObj, "STAGE CLEAR!", `Mantap! Naik level.`);
                    state.score += 300; state.stage += 1; state.size += 2; 
                    state.maze = generateMaze(state.size, state.size);
                    state.x = 1; state.y = 1;
                    
                    let keyIdx = state.inventory.indexOf('key');
                    if (keyIdx > -1) state.inventory.splice(keyIdx, 1);
                    state.hasKey = false;
                    
                    populateEntities(state);
                } else {
                    showToast(playerObj, "TERKUNCI", "Pintu keluar butuh kunci emas 🔑.");
                }
            } else {
                state.x = nextX; state.y = nextY;
            }
        }
    }
    updateStatsUI(playerObj); requestAnimationFrame(drawGame);
}

document.addEventListener('pointerdown', (e) => {
    if (!window.isGameActive) return;
    let btn = e.target.closest('.dpad-btn, .action-grab, .action-inv, .action-use-item');
    if (!btn) return;
    e.preventDefault();
    
    const player = btn.dataset.player;
    if (btn.classList.contains('action-grab')) grabItem(player);
    else if (btn.classList.contains('action-inv')) document.getElementById(`inv-p${player}`).classList.toggle('hidden');
    else if (btn.classList.contains('action-use-item')) useItem(player, btn.dataset.index);
    else {
        const dir = btn.dataset.dir;
        if (player && dir) movePlayer(player, dir);
    }
});