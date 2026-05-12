// gameLogic.js - Clean Version (Optimized Movement & Combat AI)

window.ITEM_DB = {
    10: { name: 'Pedang Kayu', emoji: '🗡️', type: 'atk', val: 10, dur: 15 },
    11: { name: 'Dua Pedang', emoji: '⚔️', type: 'atk', val: 18, dur: 20 },
    12: { name: 'Pedang Emas', emoji: '🔱', type: 'atk', val: 30, dur: 25 },
    13: { name: '3 Lilin', emoji: '🕯️', type: 'util', utilType: 'light', dur: 15 },
    14: { name: 'Obor', emoji: '🔥', type: 'util', utilType: 'light', dur: 25 },
    15: { name: 'Jubah Anti-Vampir', emoji: '🧥', type: 'util', utilType: 'light', defBonus: 5, dur: 30 },
    16: { name: 'Perisai Kayu', emoji: '🪵', type: 'def', val: 5, dur: 15 },
    17: { name: 'Baju Armor', emoji: '🦺', type: 'def', val: 12, dur: 25 },
    18: { name: 'Perisai Besi', emoji: '🛡️', type: 'def', val: 20, dur: 30 },
    19: { name: 'Apel', emoji: '🍎', type: 'heal', val: 20 },
    20: { name: 'Jus Buah', emoji: '🧃', type: 'heal', val: 35 },
    21: { name: 'Daging Sapi', emoji: '🥩', type: 'heal', val: 50 },
    22: { name: 'Daging Rusa', emoji: '🍗', type: 'heal', val: 75 },
    23: { name: 'Obat', emoji: '💊', type: 'heal', val: 100 }
};

window.p1State = {}; window.p2State = {};
let gameInterval; let enemyInterval;
window.isGameActive = false;

let joysticks = {
    1: { dx: 0, dy: 0, active: false, pad: 'analog-1', knob: 'knob-1' },
    2: { dx: 0, dy: 0, active: false, pad: 'analog-2', knob: 'knob-2' }
};

function showToast(playerObj, title, message) {
    let toast = document.getElementById(`toast-p${playerObj}`);
    document.getElementById(`toast-p${playerObj}-title`).innerText = title + ":";
    document.getElementById(`toast-p${playerObj}-msg`).innerText = message;
    
    toast.classList.remove('hidden');
    if(toast.timeoutId) clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => { toast.classList.add('hidden'); }, 2000);
}

function saveToLeaderboard(name, score, stage) {
    if (score === 0) return; 
    let lbData = JSON.parse(localStorage.getItem('logicGameLB') || '[]');
    lbData.push({ name: name, score: score, stage: stage });
    localStorage.setItem('logicGameLB', JSON.stringify(lbData));
}

function triggerGameOver() {
    window.isGameActive = false;
    clearInterval(gameInterval); clearInterval(enemyInterval);
    
    let n1 = window.p1State.name; let s1 = window.p1State.score;
    let n2 = window.p2State.name; let s2 = window.p2State.score;
    
    let winnerText = "DRAW!";
    if (s1 > s2) winnerText = `${n1} WIN!`;
    else if (s2 > s1) winnerText = `${n2} WIN!`;

    document.getElementById('gameover-winner').innerText = winnerText;
    
    document.getElementById('go-p1-name').innerText = n1;
    document.getElementById('go-p1-score').innerText = s1;
    document.getElementById('go-p1-stage').innerText = window.p1State.stage;
    document.getElementById('go-p1-kills').innerText = window.p1State.stats.kills;
    document.getElementById('go-p1-dmgDealt').innerText = window.p1State.stats.dmgDealt;
    document.getElementById('go-p1-dmgTaken').innerText = window.p1State.stats.dmgTaken;

    document.getElementById('go-p2-name').innerText = n2;
    document.getElementById('go-p2-score').innerText = s2;
    document.getElementById('go-p2-stage').innerText = window.p2State.stage;
    document.getElementById('go-p2-kills').innerText = window.p2State.stats.kills;
    document.getElementById('go-p2-dmgDealt').innerText = window.p2State.stats.dmgDealt;
    document.getElementById('go-p2-dmgTaken').innerText = window.p2State.stats.dmgTaken;

    saveToLeaderboard(n1, s1, window.p1State.stage);
    saveToLeaderboard(n2, s2, window.p2State.stage);

    document.getElementById('screen-game').classList.add('hidden');
    document.getElementById('custom-modal').classList.add('hidden'); 
    document.getElementById('screen-gameover').classList.remove('hidden');
}

function checkDeath(playerObj, state, killerName) {
    if (state.hp <= 0 && !state.isDead) {
        let diff = window.GameConfig.diff || 3;
        let hasHeal = state.inventory.some(id => id !== 'key' && window.ITEM_DB[id].type === 'heal');
        
        if (diff < 4 && hasHeal && !state.isPaused) {
            state.hp = 1; state.isPaused = true; 
            showToast(playerObj, "KRITIS!", "Game dijeda! Gunakan penyembuh!");
            document.getElementById(`inv-p${playerObj}`).classList.remove('hidden'); 
            updateStatsUI(playerObj);
            return false; 
        }
        
        state.hp = 0; state.isDead = true; 

        let overlay = document.getElementById(`dead-overlay-p${playerObj}`);
        if(overlay) overlay.classList.remove('hidden');

        showToast(playerObj, "GUGUR", `Tewas oleh ${killerName}`);
        
        let otherHp = playerObj == 1 ? window.p2State.hp : window.p1State.hp;
        if(otherHp <= 0) setTimeout(triggerGameOver, 2000); 

        return true; 
    }
    return state.isDead;
}

function triggerEffect(playerObj, type) {
    let screen = document.getElementById(`p${playerObj}-screen`);
    if(!screen) return;
    screen.classList.remove('effect-damage', 'effect-heal', 'effect-buff', 'effect-attack');
    void screen.offsetWidth; 
    screen.classList.add(`effect-${type}`);
    setTimeout(() => { screen.classList.remove(`effect-${type}`); }, 400); 
}

function addVisualEffect(state, x, y, emoji, type = 'normal') {
    state.effects.push({ x: x, y: y, emoji: emoji, life: 1.0, type: type });
}

function handleStageClear(playerObj, state) {
    showToast(playerObj, "STAGE CLEAR!", `Naik level!`);
    state.score += 300; state.stage += 1; state.size += 2; 
    state.maze = generateMaze(state.size, state.size);
    state.x = 1; state.y = 1; state.visualX = 1; state.visualY = 1;
    
    let keyIdx = state.inventory.indexOf('key');
    if (keyIdx > -1) state.inventory.splice(keyIdx, 1);
    state.hasKey = false;
    
    populateEntities(state);
    updateStatsUI(playerObj);
}

function populateEntities(state) {
    state.monsters = {}; let emptyCells = [];
    for(let y=1; y<state.size-1; y++) {
        for(let x=1; x<state.size-1; x++) {
            if(state.maze[y][x] === 0 && !(x === 1 && y === 1)) emptyCells.push({x, y});
        }
    }
    emptyCells.sort(() => Math.random() - 0.5);
    
    let diff = window.GameConfig.diff || 3;
    let monsterCount = Math.floor(state.size / 4) + diff; 
    let safeDistFromPlayer = 4 + diff; 
    let placedMonsters = [];

    for(let i = emptyCells.length - 1; i >= 0 && placedMonsters.length < monsterCount; i--) {
        let cell = emptyCells[i];
        let distToPlayer = Math.abs(cell.x - 1) + Math.abs(cell.y - 1);
        if (distToPlayer < safeDistFromPlayer) continue;

        let isTooClose = placedMonsters.some(m => (Math.abs(m.x - cell.x) + Math.abs(m.y - cell.y)) < 3);
        if (isTooClose) continue;

        placedMonsters.push(cell);
        let isDark = Math.random() > 0.5;
        let hpScale = state.stage * 5; let atkScale = state.stage * 2;
        
        state.monsters[`${cell.x},${cell.y}`] = isDark ? 
             { visualX: cell.x, visualY: cell.y, originX: cell.x, originY: cell.y, type: 'dark', emoji: '🧛', hp: 30+(diff*5)+hpScale, atk: 12+(diff*3)+atkScale, def: diff, name: 'Vampire' } : 
             { visualX: cell.x, visualY: cell.y, originX: cell.x, originY: cell.y, type: 'beast', emoji: '🐺', hp: 25+(diff*5)+hpScale, atk: 10+(diff*2)+atkScale, def: diff+2, name: 'Werewolf' };
             
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
    for(let i=0; i<weaponCount && emptyCells.length > 0; i++) { state.maze[emptyCells.pop().y][emptyCells.pop().x] = 10 + Math.floor(Math.random() * 3); }
    for(let i=0; i<utilCount && emptyCells.length > 0; i++) { state.maze[emptyCells.pop().y][emptyCells.pop().x] = Math.random() > 0.5 ? 13 + Math.floor(Math.random() * 3) : 16 + Math.floor(Math.random() * 3); }
}

function processEnemyAI(playerObj, state) {
    let newMonsters = {}; let playerAttacked = false; 
    let diff = window.GameConfig.diff || 3;
    let px = Math.round(state.x); let py = Math.round(state.y);
    let isUntargetable = (state.hp <= 0 || state.isDead || state.isPaused);

    for (let key in state.monsters) {
        let m = state.monsters[key];
        let [mx, my] = key.split(',').map(Number);
        
        let distToPlayer = Math.abs(px - mx) + Math.abs(py - my);
        let distToOrigin = Math.abs(m.originX - mx) + Math.abs(m.originY - my);
        let aggroRange = 4; let leashRange = 6; 
        
        if (!isUntargetable && distToPlayer <= 1) {
            let mAtk = m.atk;
            if(m.type === 'dark' && state.lightBuff === 0) mAtk += 15;
            let dmgToPlayer = Math.max(0, mAtk - state.def);
            
            state.hp -= dmgToPlayer;
            state.stats.dmgTaken += dmgToPlayer;
            
            let atkEmoji = m.type === 'dark' ? '🦇' : '爪'; 
            addVisualEffect(state, px, py, atkEmoji, 'enemy_attack');
            triggerEffect(playerObj, 'damage');
            
            playerAttacked = true; 
            newMonsters[`${mx},${my}`] = m;
            
            if (checkDeath(playerObj, state, m.name)) continue; 
            else if (state.hp > 0 && dmgToPlayer > 0 && !state.isPaused) {
                showToast(playerObj, "AWAS!", `-${dmgToPlayer} HP`);
            }
        }
        else if (!isUntargetable && diff > 3 && distToPlayer <= aggroRange && distToOrigin < leashRange) {
            let dirs = [[0,-1], [0,1], [-1,0], [1,0]].sort((a, b) => {
                let dA = Math.abs(px - (mx + a[0])) + Math.abs(py - (my + a[1]));
                let dB = Math.abs(px - (mx + b[0])) + Math.abs(py - (my + b[1]));
                return dA - dB; 
            });

            let moved = false;
            for (let d of dirs) {
                let nx = mx + d[0]; let ny = my + d[1];
                if (state.maze[ny][nx] !== 1 && state.maze[ny][nx] !== 3 && !newMonsters[`${nx},${ny}`]) {
                    newMonsters[`${nx},${ny}`] = m; moved = true; break;
                }
            }
            if (!moved) newMonsters[`${mx},${my}`] = m;
        }
        else if (!isUntargetable && diff > 3 && distToOrigin > 0 && (distToPlayer > aggroRange || distToOrigin >= leashRange)) {
            let dirs = [[0,-1], [0,1], [-1,0], [1,0]].sort((a, b) => {
                let dA = Math.abs(m.originX - (mx + a[0])) + Math.abs(m.originY - (my + a[1]));
                let dB = Math.abs(m.originX - (mx + b[0])) + Math.abs(m.originY - (my + b[1]));
                return dA - dB; 
            });

            let moved = false;
            for (let d of dirs) {
                let nx = mx + d[0]; let ny = my + d[1];
                if (state.maze[ny][nx] !== 1 && state.maze[ny][nx] !== 3 && !newMonsters[`${nx},${ny}`]) {
                    newMonsters[`${nx},${ny}`] = m; moved = true; break;
                }
            }
            if (!moved) newMonsters[`${mx},${my}`] = m;
        }
        else if (Math.random() < 0.3) {
            let dirs = [[0,-1], [0,1], [-1,0], [1,0]].sort(() => Math.random() - 0.5);
            let moved = false;
            for (let d of dirs) {
                let nx = mx + d[0]; let ny = my + d[1];
                let distToOrig = Math.abs(m.originX - nx) + Math.abs(m.originY - ny);
                if (distToOrig <= 2 && state.maze[ny][nx] !== 1 && state.maze[ny][nx] !== 3 && !newMonsters[`${nx},${ny}`]) {
                    newMonsters[`${nx},${ny}`] = m; moved = true; break;
                }
            }
            if (!moved) newMonsters[`${mx},${my}`] = m;
        } else {
            newMonsters[`${mx},${my}`] = m;
        }
    }
    state.monsters = newMonsters;
    if (playerAttacked) updateStatsUI(playerObj);
}

function setupJoysticks() {
    [1, 2].forEach(p => {
        let pad = document.getElementById(joysticks[p].pad);
        let knob = document.getElementById(joysticks[p].knob);
        if (!pad) return;

        pad.addEventListener('pointerdown', (e) => {
            let state = p == 1 ? window.p1State : window.p2State;
            if(!window.isGameActive || state.hp <= 0 || state.isDead || state.isPaused) return;
            joysticks[p].active = true;
            pad.setPointerCapture(e.pointerId);
            moveJoy(e);
        });
        pad.addEventListener('pointermove', moveJoy);
        pad.addEventListener('pointerup', stopJoy);
        pad.addEventListener('pointercancel', stopJoy);

        function moveJoy(e) {
            if (!joysticks[p].active) return;
            let rect = pad.getBoundingClientRect();
            let cx = rect.left + rect.width/2;
            let cy = rect.top + rect.height/2;
            let dx = e.clientX - cx; let dy = e.clientY - cy;
            let dist = Math.sqrt(dx*dx + dy*dy);
            let maxDist = rect.width/2 - knob.offsetWidth/2;

            if (dist > maxDist) { dx = (dx/dist) * maxDist; dy = (dy/dist) * maxDist; }
            knob.style.transform = `translate(${dx}px, ${dy}px)`;
            joysticks[p].dx = dx / maxDist; joysticks[p].dy = dy / maxDist;
        }
        function stopJoy(e) {
            joysticks[p].active = false;
            joysticks[p].dx = 0; joysticks[p].dy = 0;
            knob.style.transform = `translate(0px, 0px)`;
            pad.releasePointerCapture(e.pointerId);
        }
    });
}

function initGame(p1Name, p2Name) {
    let diff = window.GameConfig.diff || 3;
    let size = 11 + ((diff - 1) * 2); 
    
    document.getElementById('dead-overlay-p1').classList.add('hidden');
    document.getElementById('dead-overlay-p2').classList.add('hidden');
    
    const baseState = () => ({ 
        x: 1, y: 1, visualX: 1, visualY: 1, hasKey: false, inventory: [], activeBuffs: [], lightBuff: 0, 
        score: 0, hp: 100, atk: 15, def: 5, stage: 1, size: size, isPaused: false, isDead: false,
        effects: [], stats: { kills: 0, dmgDealt: 0, dmgTaken: 0 }
    });
    
    window.p1State = { ...baseState(), id: 1, name: p1Name, theme: 'ruins', maze: generateMaze(size, size) };
    window.p2State = { ...baseState(), id: 2, name: p2Name, theme: 'jungle', maze: generateMaze(size, size) };
    
    populateEntities(window.p1State); populateEntities(window.p2State);
    updateStatsUI(1); updateStatsUI(2);
    
    if (!window.joysticksReady) { setupJoysticks(); window.joysticksReady = true; }
    if (window.GameConfig.smooth) {
        document.querySelectorAll('.dpad').forEach(e => e.classList.add('hidden'));
        document.querySelectorAll('.analog-pad').forEach(e => e.classList.remove('hidden'));
    } else {
        document.querySelectorAll('.dpad').forEach(e => e.classList.remove('hidden'));
        document.querySelectorAll('.analog-pad').forEach(e => e.classList.add('hidden'));
    }
    
    clearInterval(gameInterval); clearInterval(enemyInterval);
    let timeRemaining = (window.GameConfig.timer || 2) * 60; 
    window.isGameActive = true;
    
    const timerUI = document.getElementById('game-timer');
    gameInterval = setInterval(() => {
        if (!window.isGameActive) return;
        timeRemaining--;
        let m = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
        let s = (timeRemaining % 60).toString().padStart(2, '0');
        timerUI.innerText = `${m}:${s}`;

        if (timeRemaining <= 0) triggerGameOver();
    }, 1000);
    
    enemyInterval = setInterval(() => {
        if (!window.isGameActive) return;
        processEnemyAI(1, window.p1State);
        processEnemyAI(2, window.p2State);
    }, 1000); 

    if (!window.isRenderLoopRunning) {
        window.isRenderLoopRunning = true;
        function loop() {
            if (window.isGameActive) {
                [1, 2].forEach(p => {
                    let state = p === 1 ? window.p1State : window.p2State;
                    if (!state) return;

                    for (let i = state.effects.length - 1; i >= 0; i--) {
                        state.effects[i].life -= 0.05; 
                        if (state.effects[i].life <= 0) state.effects.splice(i, 1);
                    }

                    if (state.hp > 0 && !state.isDead) {
                        if (window.GameConfig.smooth && !state.isPaused) {
                            let jx = joysticks[p].dx; let jy = joysticks[p].dy;
                            if (jx !== 0 || jy !== 0) {
                                let speed = 0.08;
                                let nextX = state.x + jx * speed; let nextY = state.y + jy * speed;

                                function isWall(cx, cy) {
                                    let rx = Math.round(cx); let ry = Math.round(cy);
                                    if(rx < 0 || rx >= state.size || ry < 0 || ry >= state.size) return true;
                                    return state.maze[ry][rx] === 1;
                                }
                                
                                let r = 0.35; 
                                let canX = !isWall(nextX-r, state.y-r) && !isWall(nextX+r, state.y-r) && !isWall(nextX-r, state.y+r) && !isWall(nextX+r, state.y+r);
                                let canY = !isWall(state.x-r, nextY-r) && !isWall(state.x+r, nextY-r) && !isWall(state.x-r, nextY+r) && !isWall(state.x+r, nextY+r);
                                
                                if (canX) state.x = nextX;
                                if (canY) state.y = nextY;

                                let gridX = Math.round(state.x); let gridY = Math.round(state.y);
                                if (state.maze[gridY] && state.maze[gridY][gridX] === 3) {
                                    if (state.hasKey) handleStageClear(p, state);
                                }
                            }
                            state.visualX = state.x; state.visualY = state.y;
                        } else {
                            state.visualX += (state.x - state.visualX) * 0.25;
                            state.visualY += (state.y - state.visualY) * 0.25;
                        }
                    }

                    for(let key in state.monsters) {
                        let m = state.monsters[key];
                        let [tx, ty] = key.split(',').map(Number);
                        m.visualX += (tx - m.visualX) * 0.08;
                        m.visualY += (ty - m.visualY) * 0.08;
                    }
                });
                drawGame();
            }
            requestAnimationFrame(loop);
        }
        loop();
    }

    function resizeCanvas() {
        let canvas1 = document.getElementById('canvas-p1'); let canvas2 = document.getElementById('canvas-p2');
        canvas1.width = canvas1.parentElement.clientWidth || 300; canvas1.height = canvas1.parentElement.clientHeight || 300;
        canvas2.width = canvas2.parentElement.clientWidth || 300; canvas2.height = canvas2.parentElement.clientHeight || 300;
    }
    window.addEventListener('resize', resizeCanvas); setTimeout(resizeCanvas, 100); 
}

function updateStatsUI(playerObj) {
    let state = playerObj == 1 ? window.p1State : window.p2State;
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
            
            if(itemId === 'key') {
                btn.innerHTML = `🔑<br><small>Kunci Keluar</small>`;
            } else {
                let d = window.ITEM_DB[itemId];
                btn.innerHTML = `${d.emoji}<br><small>${d.name}</small>`;
                
                if (d.type === 'heal' && state.hp <= 20) {
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
    renderMaze(ctx1, window.p1State.maze, window.p1State.size, window.p1State.size, window.p1State.theme, window.p1State);
    renderMaze(ctx2, window.p2State.maze, window.p2State.size, window.p2State.size, window.p2State.theme, window.p2State);
}

function grabItem(playerObj) {
    let state = playerObj == 1 ? window.p1State : window.p2State;
    if (state.isPaused || state.isDead) return;

    let gridX = Math.round(state.x); let gridY = Math.round(state.y);
    let cell = state.maze[gridY][gridX];
    
    let diff = window.GameConfig.diff || 3;
    let maxInv = 10 - diff; 
    let currentItemsCount = state.inventory.filter(i => i !== 'key').length;
    
    if (cell === 2 || (cell >= 10 && cell <= 23)) {
        if(cell !== 2 && currentItemsCount >= maxInv) { 
            showToast(playerObj, "TAS PENUH", `Maks. ${maxInv} barang!`); return; 
        }
        
        let itemName = "";
        if (cell === 2) { state.inventory.push('key'); state.hasKey = true; itemName = "Kunci Emas 🔑"; }
        else { state.inventory.push(cell); itemName = `${window.ITEM_DB[cell].emoji} ${window.ITEM_DB[cell].name}`; }
        
        state.maze[gridY][gridX] = 0; state.score += 15;
        triggerEffect(playerObj, 'buff');
        showToast(playerObj, "AMBIL", `${itemName} masuk tas.`);
        updateStatsUI(playerObj); 
    } else showToast(playerObj, "KOSONG", "Tidak ada item.");
}

function useItem(playerObj, itemIndex) {
    let state = playerObj == 1 ? window.p1State : window.p2State;
    let itemId = state.inventory[itemIndex];
    if (!itemId) return;
    
    if (itemId === 'key') { showToast(playerObj, "INFO", "Tabrak pintu untuk pakai."); return; }
    
    let item = window.ITEM_DB[itemId];
    state.inventory.splice(itemIndex, 1);
    document.getElementById(`inv-p${playerObj}`).classList.add('hidden'); 
    
    if(item.type === 'heal') {
        state.hp = Math.min(200, state.hp + item.val);
        if (state.isPaused) state.isPaused = false; 
        triggerEffect(playerObj, 'heal'); 
        showToast(playerObj, "HEAL", `+${item.val} HP.`);
    } else {
        let buffObj = { id: itemId, emoji: item.emoji }; 
        state.activeBuffs.push(buffObj);
        triggerEffect(playerObj, 'buff'); 
        
        if (item.type === 'atk') state.atk += item.val;
        if (item.type === 'def') state.def += item.val;
        if (item.type === 'util' && item.utilType === 'light') { state.lightBuff++; if(item.defBonus) state.def += item.defBonus; }
        
        showToast(playerObj, "BUFF", `${item.name} aktif!`);
        
        setTimeout(() => {
            if (item.type === 'atk') state.atk -= item.val;
            if (item.type === 'def') state.def -= item.val;
            if (item.type === 'util' && item.utilType === 'light') { state.lightBuff--; if(item.defBonus) state.def -= item.defBonus; }
            let idx = state.activeBuffs.indexOf(buffObj);
            if (idx > -1) state.activeBuffs.splice(idx, 1);
            showToast(playerObj, "HABIS", `Efek ${item.name} selesai.`);
            updateStatsUI(playerObj);
        }, item.dur * 1000);
    }
    updateStatsUI(playerObj); 
}

function attackEnemy(playerObj) {
    let state = playerObj == 1 ? window.p1State : window.p2State;
    if (!window.isGameActive || state.hp <= 0 || state.isDead || state.isPaused) return;

    let px = Math.round(state.x); let py = Math.round(state.y);
    let targetKey = null;

    for (let key in state.monsters) {
        let [mx, my] = key.split(',').map(Number);
        let dist = Math.abs(px - mx) + Math.abs(py - my);
        if (dist <= 1) { targetKey = key; break; }
    }

    if (targetKey) {
        let monster = state.monsters[targetKey];
        let pAtk = state.atk;
        if (monster.type === 'dark' && state.lightBuff > 0) pAtk += 20;

        let dmgToMonster = Math.max(1, pAtk - monster.def);
        monster.hp -= dmgToMonster;
        state.stats.dmgDealt += dmgToMonster;

        let weaponEmoji = '💥'; 
        let atkBuffs = state.activeBuffs.filter(b => window.ITEM_DB[b.id] && window.ITEM_DB[b.id].type === 'atk');
        if (atkBuffs.length > 0) weaponEmoji = atkBuffs[atkBuffs.length - 1].emoji;

        triggerEffect(playerObj, 'attack'); 
        let [mx, my] = targetKey.split(',').map(Number);
        addVisualEffect(state, mx, my, weaponEmoji, 'player_attack');

        if (monster.hp <= 0) {
            delete state.monsters[targetKey];
            state.score += 150;
            state.stats.kills += 1;
            showToast(playerObj, "MENANG!", `${monster.emoji} hancur!`);
        } else {
            showToast(playerObj, "SERANG!", `Kena! -${dmgToMonster}`);
        }
        updateStatsUI(playerObj); 
    } else {
        showToast(playerObj, "KOSONG", "Tidak ada musuh di dekatmu!");
    }
}

function movePlayer(playerObj, dir) {
    let state = playerObj == 1 ? window.p1State : window.p2State;
    if (state.hp <= 0 || state.isDead || !window.isGameActive || state.isPaused || window.GameConfig.smooth) return; 
    
    let nextX = Math.round(state.x); let nextY = Math.round(state.y);
    
    if (dir === 'up') nextY--; else if (dir === 'down') nextY++;
    else if (dir === 'left') nextX--; else if (dir === 'right') nextX++;
    
    if (nextX >= 0 && nextX < state.size && nextY >= 0 && nextY < state.size) {
        let targetCell = state.maze[nextY][nextX];
        let hasMonster = state.monsters[`${nextX},${nextY}`] !== undefined;
        
        if (hasMonster) {
            attackEnemy(playerObj); 
        } else if (targetCell !== 1) { 
            if (targetCell === 3) {
                if (state.hasKey) handleStageClear(playerObj, state);
                else showToast(playerObj, "TERKUNCI", "Butuh kunci 🔑.");
            } else {
                state.x = nextX; state.y = nextY;
            }
        }
    }
    updateStatsUI(playerObj); 
}

let moveTimeouts = { 1: null, 2: null };
let moveIntervals = { 1: null, 2: null };

function startMoving(player, dir) {
    movePlayer(player, dir);
    moveTimeouts[player] = setTimeout(() => {
        moveIntervals[player] = setInterval(() => { movePlayer(player, dir); }, 150);
    }, 300);
}
function stopMoving(player) {
    clearTimeout(moveTimeouts[player]); clearInterval(moveIntervals[player]);
}

document.addEventListener('pointerdown', (e) => {
    if (!window.isGameActive) return;
    let btn = e.target.closest('.dpad-btn, .action-grab, .action-inv, .action-use-item, .action-attack');
    if (!btn) return;
    e.preventDefault();
    
    const player = btn.dataset.player;
    if (btn.classList.contains('action-grab')) grabItem(player);
    else if (btn.classList.contains('action-attack')) attackEnemy(player);
    else if (btn.classList.contains('action-inv')) document.getElementById(`inv-p${player}`).classList.toggle('hidden');
    else if (btn.classList.contains('action-use-item')) useItem(player, btn.dataset.index);
    else if (btn.classList.contains('dpad-btn')) {
        const dir = btn.dataset.dir;
        if (player && dir) startMoving(player, dir);
    }
});

document.addEventListener('pointerup', (e) => {
    let btn = e.target.closest('.dpad-btn');
    if (btn) stopMoving(btn.dataset.player);
    else { stopMoving(1); stopMoving(2); }
});
document.addEventListener('pointerleave', (e) => {
    let btn = e.target.closest('.dpad-btn');
    if (btn) stopMoving(btn.dataset.player);
});
document.addEventListener('pointercancel', () => { stopMoving(1); stopMoving(2); });