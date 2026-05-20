// gameLogic.js - Inti State, Game Loop, Kematian, dan Serangan Pemain

window.p1State = {}; window.p2State = {};
window.gameInterval = null; window.enemyInterval = null;
window.isGameActive = false;
window.lastFrameTime = 0;

function saveToLeaderboard(name, score, stage) {
    if (score === 0) return; 
    let lbData = JSON.parse(localStorage.getItem('logicGameLB') || '[]');
    let modeLabel = window.GameConfig.mode.toUpperCase();
    lbData.push({ name: `${name} [${modeLabel}]`, score: score, stage: stage });
    localStorage.setItem('logicGameLB', JSON.stringify(lbData));
}

function triggerGameOver() {
    window.isGameActive = false;
    clearInterval(window.gameInterval); clearInterval(window.enemyInterval);
    
    let isSingle = window.GameConfig.players === 1;
    let n1 = window.p1State.name; let s1 = window.p1State.score;
    let n2 = isSingle ? "" : window.p2State.name; 
    let s2 = isSingle ? 0 : window.p2State.score;
    
    let winnerText = "GAME SELESAI!";
    if (!isSingle) {
        winnerText = "DRAW!";
        if (s1 > s2) winnerText = `${n1} WIN!`;
        else if (s2 > s1) winnerText = `${n2} WIN!`;
    }

    document.getElementById('gameover-winner').innerText = winnerText;
    
    // P1 Stats
    document.getElementById('go-p1-name').innerText = n1;
    document.getElementById('go-p1-score').innerText = s1;
    document.getElementById('go-p1-stage').innerText = window.p1State.stage;
    document.getElementById('go-p1-kills').innerText = window.p1State.stats.kills;
    document.getElementById('go-p1-dmgDealt').innerText = window.p1State.stats.dmgDealt;
    document.getElementById('go-p1-dmgTaken').innerText = window.p1State.stats.dmgTaken;
    saveToLeaderboard(n1, s1, window.p1State.stage);

    let goCardP2 = document.getElementById('go-card-p2');
    if (!isSingle) {
        goCardP2.classList.remove('hidden');
        document.getElementById('go-p2-name').innerText = n2;
        document.getElementById('go-p2-score').innerText = s2;
        document.getElementById('go-p2-stage').innerText = window.p2State.stage;
        document.getElementById('go-p2-kills').innerText = window.p2State.stats.kills;
        document.getElementById('go-p2-dmgDealt').innerText = window.p2State.stats.dmgDealt;
        document.getElementById('go-p2-dmgTaken').innerText = window.p2State.stats.dmgTaken;
        saveToLeaderboard(n2, s2, window.p2State.stage);
    } else {
        goCardP2.classList.add('hidden');
    }

    document.getElementById('screen-game').classList.add('hidden');
    document.getElementById('custom-modal').classList.add('hidden'); 
    document.getElementById('screen-gameover').classList.remove('hidden');
}

function executeDeath(playerObj, state, killerName) {
    state.hp = 0; state.isDead = true; state.isPaused = false;
    let overlay = document.getElementById(`dead-overlay-p${playerObj}`);
    if(overlay) overlay.classList.remove('hidden');

    showToast(playerObj, "GUGUR", `Tewas oleh ${killerName}`);
    
    if (window.GameConfig.players === 1) {
        setTimeout(triggerGameOver, 2000); 
    } else {
        let otherHp = playerObj == 1 ? window.p2State.hp : window.p1State.hp;
        let otherDead = playerObj == 1 ? window.p2State.isDead : window.p1State.isDead;
        if(otherHp <= 0 || otherDead) setTimeout(triggerGameOver, 2000); 
    }
}

function checkDeath(playerObj, state, killerName) {
    if (state.hp <= 0 && !state.isDead) {
        if (state.isPromptingResurrect) return false;

        let diff = window.GameConfig.diff || 3;
        let hasSaveItem = state.inventory.some(id => id !== 'key' && (window.ITEM_DB[id].type === 'heal' || window.ITEM_DB[id].type === 'shield'));
        
        if (diff < 4 && hasSaveItem && !state.isPaused) {
            state.hp = 1; state.isPaused = true; 
            showToast(playerObj, "KRITIS!", "Game dijeda! Gunakan pemulih!");
            document.getElementById(`inv-p${playerObj}`).classList.remove('hidden'); 
            updateStatsUI(playerObj);
            return false; 
        }
        
        if (state.score >= 1000) {
            state.isPromptingResurrect = true;
            state.isPaused = true;
            
            window.CustomDialog.confirm(
                `Kamu tewas! Ingin bangkit kembali dengan buff kebal 10 detik?\n\nBiaya: 25% Skor (Skormu: ${state.score})`, 
                "RESURRECTION", 
                () => { // Confirm
                    state.isPromptingResurrect = false;
                    state.score = Math.floor(state.score * 0.75);
                    state.hp = 100; state.isPaused = false; state.isDead = false; state.isInvincible = true;
                    
                    let screen = document.getElementById(`p${playerObj}-screen`);
                    if(screen) screen.classList.add('effect-invincible');
                    showToast(playerObj, "BANGKIT!", "Kebal 10 detik!");
                    
                    state.activeBuffs.push({
                        id: 999, emoji: '👼', name: 'Resurrection',
                        maxTime: 10, timeLeft: 10, atkBonus: 0, defBonus: 0, lightBonus: 0, isInvincibility: true
                    });
                    
                    updateStatsUI(playerObj);
                },
                () => { // Batal
                    state.isPromptingResurrect = false;
                    executeDeath(playerObj, state, killerName);
                }
            );
            return false; 
        }

        executeDeath(playerObj, state, killerName);
        return true; 
    }
    return state.isDead;
}

function checkLineOfSight(state, x1, y1, x2, y2) {
    let dist = Math.hypot(x2 - x1, y2 - y1);
    let steps = Math.max(Math.ceil(dist * 3), 1);
    for (let i = 1; i <= steps; i++) {
        let cx = x1 + (x2 - x1) * (i / steps);
        let cy = y1 + (y2 - y1) * (i / steps);
        // FIX BUG: Menggunakan round untuk sinkronisasi posisi musuh (float) ke array maze (int)
        let rx = Math.round(cx); let ry = Math.round(cy);
        if (rx >= 0 && rx < state.width && ry >= 0 && ry < state.height) {
            if (state.maze[ry][rx] === 1) return false; 
        }
    }
    return true;
}

function attackEnemy(playerObj) {
    let state = playerObj == 1 ? window.p1State : window.p2State;
    if (!window.isGameActive || state.hp <= 0 || state.isDead || state.isPaused || state.isPromptingResurrect) return;

    let px = state.x; let py = state.y;
    
    // FIX BUG: Perbesar Radius Jangkauan agar mencakup diagonal area pada musuh off-grid
    let atkRange = 1.5; 
    let weaponEmoji = '👊'; 
    let atkBuffs = state.activeBuffs.filter(b => window.ITEM_DB[b.id] && window.ITEM_DB[b.id].type === 'atk');
    
    if (atkBuffs.length > 0) {
        atkBuffs.sort((a,b) => window.ITEM_DB[a.id].val - window.ITEM_DB[b.id].val);
        let bestWeapon = window.ITEM_DB[atkBuffs[atkBuffs.length - 1].id];
        weaponEmoji = bestWeapon.emoji;
        if (bestWeapon.id == 11) atkRange = 2.2; 
        else if (bestWeapon.id == 12) atkRange = 2.8; 
        else atkRange = 1.8; 
    }

    let fLen = Math.hypot(state.facingX, state.facingY) || 1;
    let dx = state.facingX / fLen; let dy = state.facingY / fLen;
    let fxX = px + dx * 0.6; let fxY = py + dy * 0.6;
    
    triggerEffect(playerObj, 'attack'); 
    state.effects.push({ x: fxX, y: fxY, emoji: weaponEmoji, life: 1.0, type: 'player_attack_swing', dx: dx, dy: dy });

    let targetIdx = -1; let minDist = Infinity;
    state.monsters.forEach((m, idx) => {
        let dist = Math.hypot(px - m.x, py - m.y);
        // Musuh bisa diserang hanya jika tak terhalang dinding (LOS True) dan masuk Radius
        if (dist <= atkRange && dist < minDist && checkLineOfSight(state, px, py, m.x, m.y)) { 
            targetIdx = idx; minDist = dist; 
        }
    });

    if (targetIdx > -1) {
        let monster = state.monsters[targetIdx];
        let pAtk = state.atk;
        if (monster.type === 'dark' && state.lightBuff > 0) pAtk += 20;

        let dmgToMonster = Math.max(1, pAtk - monster.def);
        monster.hp -= dmgToMonster;
        state.stats.dmgDealt += dmgToMonster;
        
        state.effects.push({ x: monster.x, y: monster.y, emoji: '💢', life: 1.0, type: 'normal' });

        if (monster.hp <= 0) {
            state.monsters.splice(targetIdx, 1);
            state.score += 150;
            state.stats.kills += 1;
            showToast(playerObj, "MENANG!", `${monster.emoji} hancur!`);
        } else {
            showToast(playerObj, "SERANG!", `Kena! -${dmgToMonster}`);
        }
    }
    updateStatsUI(playerObj); 
}

function populateEntities(state) {
    state.monsters = []; 
    let emptyCells = [];
    for(let y=1; y<state.height-1; y++) {
        for(let x=1; x<state.width-1; x++) {
            if(state.maze[y][x] === 0 && !(x === 1 && y === 1)) emptyCells.push({x, y});
        }
    }
    emptyCells.sort(() => Math.random() - 0.5);
    
    let diff = window.GameConfig.diff || 3;
    // FIX FEATURE: Jika Diff > 3, Boss di Stage 5. Sisanya Boss Stage di Stage 10.
    let bossInterval = diff > 3 ? 5 : 10;
    let isBossStage = state.stage % bossInterval === 0;

    if (isBossStage) {
        let bossCell = emptyCells.shift();
        let bossHp = 100 + (state.stage * 15) + (diff * 30);
        let bossAtk = 25 + (state.stage * 4) + (diff * 8);
        state.monsters.push({ 
             x: bossCell.x, y: bossCell.y, originX: bossCell.x, originY: bossCell.y, 
             visualX: bossCell.x, visualY: bossCell.y, atkCooldown: 0,
             type: 'boss', emoji: '👹', hp: bossHp, maxHp: bossHp, atk: bossAtk, def: diff * 3, name: 'Demon Lord' 
        });
    } else {
        let monsterCount = Math.floor(Math.max(state.width, state.height) / 4) + diff; 
        let safeDistFromPlayer = 4 + diff; 
        let placedMonsters = [];

        for(let i = emptyCells.length - 1; i >= 0 && placedMonsters.length < monsterCount; i--) {
            let cell = emptyCells[i];
            let distToPlayer = Math.abs(cell.x - 1) + Math.abs(cell.y - 1);
            if (distToPlayer < safeDistFromPlayer) continue;

            placedMonsters.push(cell);
            let isDark = Math.random() > 0.5;
            let hpScale = state.stage * 5; let atkScale = state.stage * 2;
            let baseHp = isDark ? 30+(diff*5)+hpScale : 25+(diff*5)+hpScale;
            
            state.monsters.push(isDark ? 
                 { x: cell.x, y: cell.y, visualX: cell.x, visualY: cell.y, originX: cell.x, originY: cell.y, atkCooldown: 0, type: 'dark', emoji: '🦇', hp: baseHp, maxHp: baseHp, atk: 12+(diff*3)+atkScale, def: diff, name: 'Vampire' } : 
                 { x: cell.x, y: cell.y, visualX: cell.x, visualY: cell.y, originX: cell.x, originY: cell.y, atkCooldown: 0, type: 'beast', emoji: '🐺', hp: baseHp, maxHp: baseHp, atk: 10+(diff*2)+atkScale, def: diff+2, name: 'Werewolf' });
                 
            emptyCells.splice(i, 1);
        }
    }
    
    let bd = state.bossDefeated || 0;
    let mapSizeMultiplier = Math.max(1, Math.floor(state.height / 10));
    let weaponCount = Math.max(1, 4 - Math.floor(diff / 2)) * mapSizeMultiplier;
    let utilCount = Math.max(1, 4 - Math.floor(diff / 2)) * mapSizeMultiplier;
    let healCount = Math.max(2, 7 - diff) * mapSizeMultiplier; 
    let shieldCount = Math.max(1, 3 - Math.floor(diff / 2)) * mapSizeMultiplier; 
    
    for(let i=0; i<healCount && emptyCells.length > 0; i++) {
        let base = diff >= 4 ? 19 : 20;
        let id = Math.min(23, base + Math.floor(Math.random() * (2 + bd)));
        state.maze[emptyCells.pop().y][emptyCells.pop().x] = id; 
    }
    for(let i=0; i<shieldCount && emptyCells.length > 0; i++) { 
        let id = Math.min(25, 24 + Math.floor(Math.random() * (1 + bd)));
        state.maze[emptyCells.pop().y][emptyCells.pop().x] = id; 
    }
    for(let i=0; i<weaponCount && emptyCells.length > 0; i++) { 
        let id = Math.min(12, 10 + Math.floor(Math.random() * (2 + bd)));
        state.maze[emptyCells.pop().y][emptyCells.pop().x] = id; 
    }
}

function handleStageClear(playerObj, state) {
    if (window.GameConfig.mode === 'speedrun' && state.stage >= window.GameConfig.maxStage) {
        window.isGameActive = false;
        window.CustomDialog.alert(`SPEEDRUN SELESAI!\nKamu berhasil menamatkan ${window.GameConfig.maxStage} stage!`, "SELAMAT!", () => triggerGameOver());
        return;
    }
    
    let diff = window.GameConfig.diff || 3;
    let bossInterval = diff > 3 ? 5 : 10;

    if (state.stage % bossInterval === 0) {
        state.bossDefeated = (state.bossDefeated || 0) + 1;
        state.maxInvBonus = (state.maxInvBonus || 0) + 2; 
        
        let atkBonus = diff * 5; let defBonus = diff * 2;
        state.baseAtk += atkBonus; state.baseDef += defBonus;
        state.atk += atkBonus; state.def += defBonus;
        state.hp = typeof getMaxHpCap === "function" ? getMaxHpCap() : 500; 
        
        showToast(playerObj, "BOSS KALAH!", "Status, Senjata & Tas Meningkat!");
    } else {
        showToast(playerObj, "STAGE CLEAR!", `Naik level!`);
    }

    state.score += 300; state.stage += 1; 
    state.height += 2;
    state.width += (window.GameConfig.players === 1 ? 4 : 2); 

    state.maze = generateMaze(state.width, state.height);
    state.x = 1; state.y = 1; state.visualX = 1; state.visualY = 1;
    
    let keyIdx = state.inventory.indexOf('key');
    if (keyIdx > -1) state.inventory.splice(keyIdx, 1);
    state.hasKey = false;
    
    populateEntities(state);
    updateStatsUI(playerObj);
}

function initGame(p1Name, p2Name) {
    let diff = window.GameConfig.diff || 3;
    let height = 11 + ((diff - 1) * 2); 
    let width = height;
    
    if (window.GameConfig.players === 1) {
        width = Math.floor(height * 1.6);
        if(width % 2 === 0) width++;
    }

    // FIX BUG: Pembersihan Status Sebelumnya Terlalu Detail
    let screen1 = document.getElementById('p1-screen');
    let screen2 = document.getElementById('p2-screen');
    let effectClasses = ['effect-invincible', 'effect-damage', 'effect-heal', 'effect-buff', 'effect-attack'];
    
    if(screen1) effectClasses.forEach(c => screen1.classList.remove(c));
    if(screen2) effectClasses.forEach(c => screen2.classList.remove(c));

    // Reset Interval Control dari inputHandling.js (jika ada)
    if (typeof stopMoving === 'function') { stopMoving(1); stopMoving(2); }
    if (window.joysticks) {
        [1, 2].forEach(p => {
            window.joysticks[p].dx = 0; window.joysticks[p].dy = 0; window.joysticks[p].active = false;
            let knob = document.getElementById(window.joysticks[p].knob);
            if (knob) knob.style.transform = 'translate(0px, 0px)';
        });
    }

    const baseState = () => ({ 
        x: 1, y: 1, visualX: 1, visualY: 1, 
        facingX: 1, facingY: 0, 
        hasKey: false, inventory: [], activeBuffs: [], lightBuff: 0, 
        score: 0, hp: 100, shield: 0, shieldAngle: 0, 
        atk: 15, def: 5, baseAtk: 15, baseDef: 5,
        stage: 1, width: width, height: height, bossDefeated: 0, maxInvBonus: 0,
        isPaused: false, isDead: false, isPromptingResurrect: false, isInvincible: false,
        effects: [], stats: { kills: 0, dmgDealt: 0, dmgTaken: 0 }
    });
    
    window.p1State = { ...baseState(), id: 1, name: p1Name, theme: 'ruins', maze: generateMaze(width, height) };
    window.p2State = { ...baseState(), id: 2, name: p2Name, theme: 'jungle', maze: generateMaze(width, height) };
    
    if (window.GameConfig.players === 1) {
        document.getElementById('p2-screen').style.display = 'none';
        document.getElementById('score-p2-wrap').style.display = 'none';
        window.p2State.isDead = true; 
    } else {
        document.getElementById('p2-screen').style.display = 'flex';
        document.getElementById('score-p2-wrap').style.display = 'inline-block';
    }

    populateEntities(window.p1State); populateEntities(window.p2State);
    updateStatsUI(1); if(window.GameConfig.players > 1) updateStatsUI(2);
    
    if (!window.joysticksReady) { setupJoysticks(); window.joysticksReady = true; }
    if (window.GameConfig.smooth) {
        document.querySelectorAll('.dpad').forEach(e => e.classList.add('hidden'));
        document.querySelectorAll('.analog-pad').forEach(e => e.classList.remove('hidden'));
    } else {
        document.querySelectorAll('.dpad').forEach(e => e.classList.remove('hidden'));
        document.querySelectorAll('.analog-pad').forEach(e => e.classList.add('hidden'));
    }
    
    clearInterval(window.gameInterval);
    
    let isTimeTrial = window.GameConfig.mode === 'time-trial';
    let timeVal = isTimeTrial ? (window.GameConfig.timer || 2) * 60 : 0; 
    window.isGameActive = true;
    
    const timerUI = document.getElementById('game-timer');
    window.gameInterval = setInterval(() => {
        if (!window.isGameActive) return;
        
        if (isTimeTrial) {
            timeVal--;
            let m = Math.floor(timeVal / 60).toString().padStart(2, '0');
            let s = (timeVal % 60).toString().padStart(2, '0');
            timerUI.innerText = `${m}:${s}`;
            if (timeVal <= 0) triggerGameOver();
        } else {
            timeVal++;
            let m = Math.floor(timeVal / 60).toString().padStart(2, '0');
            let s = (timeVal % 60).toString().padStart(2, '0');
            timerUI.innerText = `${m}:${s}`;
        }
    }, 1000);

    window.lastFrameTime = performance.now();

    // Sisa loop Game Engine dibiarkan tak ada perubahan
    if (!window.isRenderLoopRunning) {
        window.isRenderLoopRunning = true;
        function loop() {
            let now = performance.now();
            let dt = (now - window.lastFrameTime) / 1000;
            window.lastFrameTime = now;

            if (window.isGameActive) {
                [1, 2].forEach(p => {
                    if (p === 2 && window.GameConfig.players === 1) return;
                    let state = p === 1 ? window.p1State : window.p2State;
                    if (!state) return;

                    for(let i = state.activeBuffs.length - 1; i >= 0; i--) {
                        let b = state.activeBuffs[i];
                        b.timeLeft -= dt;
                        if(b.timeLeft <= 0) {
                            if(b.isInvincibility) {
                                state.isInvincible = false;
                                let screen = document.getElementById(`p${p}-screen`);
                                if(screen) screen.classList.remove('effect-invincible');
                                showToast(p, "INFO", "Buff kebal habis.");
                            } else {
                                state.atk -= b.atkBonus;
                                state.def -= b.defBonus;
                                state.lightBuff -= b.lightBonus;
                                showToast(p, "HABIS", `Efek ${b.name} selesai.`);
                            }
                            state.activeBuffs.splice(i, 1);
                            updateStatsUI(p); 
                        } else {
                            let el = document.getElementById(`buff-p${p}-${b.id}-${i}`);
                            if(el) {
                                let pct = (b.timeLeft / b.maxTime) * 100;
                                el.style.setProperty('--pct', `${pct}%`);
                            }
                        }
                    }

                    for (let i = state.effects.length - 1; i >= 0; i--) {
                        state.effects[i].life -= 0.06; 
                        if (state.effects[i].life <= 0) state.effects.splice(i, 1);
                    }

                    function isWall(st, cx, cy) {
                        let rx = Math.round(cx); let ry = Math.round(cy);
                        if(rx < 0 || rx >= st.width || ry < 0 || ry >= st.height) return true;
                        return st.maze[ry][rx] === 1;
                    }

                    if (state.hp > 0 && !state.isDead) {
                        if (window.GameConfig.smooth && !state.isPaused && !state.isPromptingResurrect) {
                            let jx = window.joysticks[p].dx; let jy = window.joysticks[p].dy;
                            if (jx !== 0 || jy !== 0) {
                                state.facingX = jx; state.facingY = jy;
                                
                                let speed = 0.08;
                                let nextX = state.x + jx * speed; let nextY = state.y + jy * speed;
                                
                                let r = 0.35; 
                                let canX = !isWall(state, nextX-r, state.y-r) && !isWall(state, nextX+r, state.y-r) && !isWall(state, nextX-r, state.y+r) && !isWall(state, nextX+r, state.y+r);
                                let canY = !isWall(state, state.x-r, nextY-r) && !isWall(state, state.x+r, nextY-r) && !isWall(state, state.x-r, nextY+r) && !isWall(state, state.x+r, nextY+r);
                                
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

                    processContinuousEnemyAI(p, state, dt, isWall);

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