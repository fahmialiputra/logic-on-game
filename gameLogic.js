// gameLogic.js - Update Fungsi executeDeath, checkDeath, attackEnemy, populateEntities, & initGame

window.p1State = {}; window.p2State = {};
window.gameInterval = null; 
window.deathTimeout = null; 
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
    
    if (window.gameInterval) { clearInterval(window.gameInterval); window.gameInterval = null; }
    if (window.deathTimeout) { clearTimeout(window.deathTimeout); window.deathTimeout = null; }
    
    let isSingle = window.GameConfig.players === 1;
    let mode = window.GameConfig.mode;
    let n1 = window.p1State.name || 'PLAYER 1'; 
    let s1 = window.p1State.score || 0;
    let n2 = isSingle ? "" : (window.p2State.name || 'PLAYER 2'); 
    let s2 = isSingle ? 0 : (window.p2State.score || 0);
    
    let modeText = "MODE: " + mode.toUpperCase().replace('-', ' ');
    document.getElementById('gameover-winner').innerHTML = `<span style="font-size:0.65rem; display:block; color:#aaa; margin-bottom:5px;">${modeText}</span>`;

    if (isSingle) {
        if (mode === 'speedrun' && window.p1State.stage >= window.GameConfig.maxStage) {
            document.getElementById('gameover-winner').innerHTML += `<span class="neon-green">SPEEDRUN COMPLETED!</span>`;
        } else {
            document.getElementById('gameover-winner').innerHTML += `<span class="neon-red">GAME OVER</span>`;
        }
    } else {
        if (s1 > s2) {
            document.getElementById('gameover-winner').innerHTML += `<span class="neon-blue">${n1} WINS!</span>`;
        } else if (s2 > s1) {
            document.getElementById('gameover-winner').innerHTML += `<span class="neon-green">${n2} WINS!</span>`;
        } else {
            document.getElementById('gameover-winner').innerHTML += `<span class="neon-yellow">DRAW / SERI!</span>`;
        }
    }
    
    document.getElementById('go-p1-name').innerText = n1;
    document.getElementById('go-p1-score').innerText = s1;
    document.getElementById('go-p1-stage').innerText = window.p1State.stage;
    document.getElementById('go-p1-kills').innerText = window.p1State.stats ? window.p1State.stats.kills : 0;
    document.getElementById('go-p1-dmgDealt').innerText = window.p1State.stats ? window.p1State.stats.dmgDealt : 0;
    document.getElementById('go-p1-dmgTaken').innerText = window.p1State.stats ? window.p1State.stats.dmgTaken : 0;
    saveToLeaderboard(n1, s1, window.p1State.stage);

    let goCardP2 = document.getElementById('go-card-p2');
    if (!isSingle) {
        goCardP2.style.display = 'block';
        document.getElementById('go-p2-name').innerText = n2;
        document.getElementById('go-p2-score').innerText = s2;
        document.getElementById('go-p2-stage').innerText = window.p2State.stage;
        document.getElementById('go-p2-kills').innerText = window.p2State.stats ? window.p2State.stats.kills : 0;
        document.getElementById('go-p2-dmgDealt').innerText = window.p2State.stats ? window.p2State.stats.dmgDealt : 0;
        document.getElementById('go-p2-dmgTaken').innerText = window.p2State.stats ? window.p2State.stats.dmgTaken : 0;
        saveToLeaderboard(n2, s2, window.p2State.stage);
    } else {
        goCardP2.style.display = 'none';
    }

    document.getElementById('screen-game').classList.add('hidden');
    document.getElementById('custom-modal').classList.add('hidden');
    
    let modalUp1 = document.getElementById('upgrade-overlay-p1');
    if (modalUp1) modalUp1.classList.add('hidden');
    let modalUp2 = document.getElementById('upgrade-overlay-p2');
    if (modalUp2) modalUp2.classList.add('hidden');
    
    document.getElementById('screen-gameover').classList.remove('hidden');
}

function executeDeath(playerObj, state, killerName) {
    state.hp = 0; state.isDead = true; state.isPaused = false;
    let overlay = document.getElementById(`dead-overlay-p${playerObj}`);
    
    if (overlay) {
        let textElement = overlay.querySelector('p');
        if (textElement) {
            if (window.GameConfig.players === 1) {
                textElement.innerText = "Mengakhiri sesi...";
            } else {
                let otherP = playerObj == 1 ? "Player 2" : "Player 1";
                textElement.innerText = `Menunggu ${otherP}...`;
            }
        }
        overlay.classList.remove('hidden');
    }

    showToast(playerObj, "GUGUR", `Tewas oleh ${killerName}`);
    
    if (window.GameConfig.players === 1) {
        window.deathTimeout = setTimeout(triggerGameOver, 2000); 
    } else {
        let otherHp = playerObj == 1 ? window.p2State.hp : window.p1State.hp;
        let otherDead = playerObj == 1 ? window.p2State.isDead : window.p1State.isDead;
        if(otherHp <= 0 || otherDead) window.deathTimeout = setTimeout(triggerGameOver, 2000); 
    }
}

function checkDeath(playerObj, state, killerName) {
    if (state.hp <= 0 && !state.isDead) {
        
        let ankhIndex = state.inventory.indexOf(39);
        if (ankhIndex > -1) {
            state.inventory.splice(ankhIndex, 1);
            state.hp = 100; state.isDead = false; state.isPaused = false;
            state.activeBuffs.push({id: 999, emoji: '👼', name: 'Ankh', maxTime: 5, timeLeft: 5, isInvincibility: true});
            showToast(playerObj, "MUKJIZAT!", "Bangkit dari kematian!");
            updateStatsUI(playerObj);
            return false;
        }

        if (state.isPromptingResurrect) return false;

        let diff = window.GameConfig.diff || 3;
        let hasSaveItem = state.inventory.some(id => id !== 'key' && window.ITEM_DB[id] && (window.ITEM_DB[id].type === 'heal' || window.ITEM_DB[id].type === 'shield'));
        
        if (diff < 4 && hasSaveItem && !state.isPaused) {
            state.hp = 1; state.isPaused = true; 
            showToast(playerObj, "KRITIS!", "Game dijeda! Gunakan pemulih!");
            document.getElementById(`inv-p${playerObj}`).classList.remove('hidden'); 
            updateStatsUI(playerObj);
            return false; 
        }
        
        let maxResurrect = diff > 4 ? 1 : (diff >= 3 ? 3 : (diff === 2 ? 5 : 10));
        let currentResurrects = state.resurrectCount || 0;
        
        if (state.score >= 1000 && currentResurrects < maxResurrect) {
            state.isPromptingResurrect = true;
            state.isPaused = true;
            let cost = Math.floor(state.score * 0.25);
            let sisa = maxResurrect - currentResurrects;
            
            window.CustomDialog.confirm(
                `Kamu tewas! Bangkit kembali?\n(Sisa: ${sisa}x)\nBiaya: 25% Skor (-${cost})`, 
                "RESURRECTION", 
                () => {
                    state.isPromptingResurrect = false;
                    state.resurrectCount = currentResurrects + 1;
                    state.score -= cost;
                    state.hp = 100; state.isPaused = false; state.isDead = false; state.isInvincible = true;
                    
                    let screen = document.getElementById(`p${playerObj}-screen`);
                    if(screen) screen.classList.add('effect-invincible');
                    showToast(playerObj, "BANGKIT!", "Kebal 10 detik!");
                    
                    state.activeBuffs.push({ id: 999, emoji: '👼', name: 'Resurrection', maxTime: 10, timeLeft: 10, isInvincibility: true });
                    updateStatsUI(playerObj);
                },
                () => {
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
    let atkRange = 1.5; let weaponEmoji = '💥'; 
    let atkBuffs = state.activeBuffs.filter(b => window.ITEM_DB[b.id] && window.ITEM_DB[b.id].type === 'atk');
    
    if (atkBuffs.length > 0) {
        atkBuffs.sort((a,b) => window.ITEM_DB[a.id].val - window.ITEM_DB[b.id].val);
        let bestWeapon = window.ITEM_DB[atkBuffs[atkBuffs.length - 1].id];
        weaponEmoji = bestWeapon.emoji;
        if (bestWeapon.id == 11) atkRange = 2.2; 
        else if (bestWeapon.id == 12) atkRange = 2.8; 
        else atkRange = 1.8; 
    }

    let pierceBuff = state.activeBuffs.find(b => b.pierce);
    if (pierceBuff) atkRange += pierceBuff.rangeBonus;

    let fLen = Math.hypot(state.facingX, state.facingY) || 1;
    let dx = state.facingX / fLen; let dy = state.facingY / fLen;
    let fxX = px + dx * 0.6; let fxY = py + dy * 0.6;
    
    triggerEffect(playerObj, 'attack'); 
    state.effects.push({ x: fxX, y: fxY, emoji: weaponEmoji, life: 1.0, type: 'player_attack_swing', dx: dx, dy: dy });

    let targetIdx = -1; let minDist = Infinity;
    state.monsters.forEach((m, idx) => {
        let dist = Math.hypot(px - m.x, py - m.y);
        let hasLOS = checkLineOfSight(state, px, py, m.x, m.y);
        if (pierceBuff && Math.random() < pierceBuff.pierceChance) hasLOS = true; 
        
        if (dist <= atkRange && dist < minDist && hasLOS) { targetIdx = idx; minDist = dist; }
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
            state.score += 150; state.stats.kills += 1;
            
            if (monster.type === 'boss') {
                let diff = window.GameConfig.diff || 3;
                state.inventory.push('key'); state.hasKey = true;
                
                state.bossDefeated = (state.bossDefeated || 0) + 1;
                state.maxInvBonus = (state.maxInvBonus || 0) + 2; 
                
                // SKALA PENINGKATAN STATUS PEMAIN
                let hpPct = diff === 5 ? 0.075 : (diff >= 3 ? 0.06 : 0.05);
                let shieldPct = diff === 5 ? 0.05 : (diff >= 3 ? 0.04 : 0.04);
                let statPct = diff === 5 ? 0.05 : (diff >= 3 ? 0.04 : 0.03);
                
                let maxHpBonus = Math.ceil(state.maxHp * hpPct);
                let maxShieldBonus = Math.ceil(state.maxShield * shieldPct);
                let atkBonus = Math.ceil(state.baseAtk * statPct);
                let defBonus = Math.ceil(state.baseDef * statPct);
                
                state.baseAtk += atkBonus; state.baseDef += defBonus;
                state.atk += atkBonus; state.def += defBonus;
                
                state.maxHp += maxHpBonus;
                state.maxShield += maxShieldBonus;
                state.hp = state.maxHp; 
                
                // Modal Peningkatan Khusus untuk Pemain Tertentu
                state.isPaused = true; 
                let upgradeOverlay = document.getElementById(`upgrade-overlay-p${playerObj}`);
                let upgradeList = document.getElementById(`upgrade-list-p${playerObj}`);
                if (upgradeOverlay && upgradeList) {
                    upgradeList.innerHTML = `
                        <p style="color:#3498db; font-weight:bold; margin-bottom:5px;">Pahlawan: ${state.name}</p>
                        <p>❤️ Batas Max HP: <span style="color:#2ecc71;">+${maxHpBonus}</span> (Total: ${state.maxHp})</p>
                        <p>💠 Batas Max Shield: <span style="color:#2ecc71;">+${maxShieldBonus}</span> (Total: ${state.maxShield})</p>
                        <p>⚔️ Kekuatan ATK: <span style="color:#2ecc71;">+${atkBonus}</span></p>
                        <p>🛡️ Pertahanan DEF: <span style="color:#2ecc71;">+${defBonus}</span></p>
                        <p>🎒 Kapasitas Tas: <span style="color:#f1c40f;">+2 Slot Baru</span></p>
                    `;
                    upgradeOverlay.classList.remove('hidden');
                }

                if (diff > 4 && Math.random() < 0.5) {
                    state.inventory.push(39); showToast(playerObj, "EPIC LOOT!", `Mendapat Ankh Pembangkit!`);
                }
            } else {
                showToast(playerObj, "MENANG!", `${monster.emoji} hancur!`);
            }
        } else {
            showToast(playerObj, "SERANG!", `Kena! -${dmgToMonster}`);
        }
    }
    updateStatsUI(playerObj); 
}

function populateEntities(state) {
    state.monsters = []; let emptyCells = [];
    for(let y=1; y<state.height-1; y++) {
        for(let x=1; x<state.width-1; x++) {
            if(state.maze[y][x] === 0 && !(x === 1 && y === 1)) emptyCells.push({x, y});
        }
    }
    emptyCells.sort(() => Math.random() - 0.5);
    
    let diff = window.GameConfig.diff || 3;
    
    // SKALA PENINGKATAN STATUS MUSUH TIAP NAIK STAGE
    let hpMult = diff === 5 ? 1.075 : (diff >= 3 ? 1.06 : 1.05);
    let statMult = diff === 5 ? 1.05 : (diff >= 3 ? 1.04 : 1.03);
    
    let stagePow = Math.max(0, state.stage - 1);
    let scaleHp = Math.pow(hpMult, stagePow);
    let scaleStat = Math.pow(statMult, stagePow);

    let bossInterval = diff === 5 ? 5 : (diff >= 3 ? 6 : 7);
    let isBossStage = state.stage % bossInterval === 0;

    if (isBossStage) {
        let bossCell = emptyCells.shift();
        let db = window.ENEMY_DB['boss'];
        let bossHp = Math.floor((db.baseHp + (diff * db.diffHpBonus)) * scaleHp);
        let bossAtk = Math.floor((db.baseAtk + (diff * db.diffAtkBonus)) * scaleStat);
        let bossDef = Math.floor((db.baseDef + (diff * db.diffDefBonus)) * scaleStat);
        
        state.monsters.push({ 
             x: bossCell.x, y: bossCell.y, originX: bossCell.x, originY: bossCell.y, 
             visualX: bossCell.x, visualY: bossCell.y, atkCooldown: 0, healUses: 0,
             type: 'boss', emoji: db.emoji, hp: bossHp, maxHp: bossHp, atk: bossAtk, def: bossDef, name: db.name 
        });
    } else {
        let monsterCount = Math.floor(Math.max(state.width, state.height) / 4) + diff; 
        
        if (diff >= 3) monsterCount = Math.min(monsterCount, Math.floor(state.width * state.height * 0.05));
        let placedMonsters = [];

        for(let i = emptyCells.length - 1; i >= 0 && placedMonsters.length < monsterCount; i--) {
            let cell = emptyCells[i];
            
            // Jarak Aman dari pemain (Spawn Awal)
            if (Math.abs(cell.x - 1) + Math.abs(cell.y - 1) < (4 + diff)) continue;
            
            let tooClose = placedMonsters.some(m => Math.hypot(m.x - cell.x, m.y - cell.y) < 2.5);
            if (tooClose) continue;
            
            placedMonsters.push(cell);
            
            // PENAMBAHAN JENIS MUSUH BARU
            let normalEnemies = ['dark', 'beast', 'slime', 'skeleton'];
            let typeKey = normalEnemies[Math.floor(Math.random() * normalEnemies.length)];
            let db = window.ENEMY_DB[typeKey];
            
            let baseHp = db.baseHp + (diff * db.diffHpBonus);
            let baseAtk = db.baseAtk + (diff * db.diffAtkBonus);
            let baseDef = db.baseDef + (diff * db.diffDefBonus);
            
            let finalHp = Math.floor(baseHp * scaleHp);
            let finalAtk = Math.floor(baseAtk * scaleStat);
            let finalDef = Math.floor(baseDef * scaleStat);

            state.monsters.push({ 
                 x: cell.x, y: cell.y, visualX: cell.x, visualY: cell.y, originX: cell.x, originY: cell.y, 
                 atkCooldown: 0, type: typeKey, emoji: db.emoji, hp: finalHp, maxHp: finalHp, atk: finalAtk, def: finalDef, name: db.name 
            });
            emptyCells.splice(i, 1);
        }
    }
    
    // PEMBAGIAN ITEM PENCEGAH UNSOLVABLE
    let bd = state.bossDefeated || 0;
    let mapSizeMultiplier = Math.max(1, Math.floor(state.height / 10));
    let weaponCount = Math.max(1, 4 - Math.floor(diff / 2)) * mapSizeMultiplier;
    let utilCount = Math.max(1, 4 - Math.floor(diff / 2)) * mapSizeMultiplier;
    let healCount = Math.max(2, 7 - diff) * mapSizeMultiplier; 
    let shieldCount = Math.max(1, 3 - Math.floor(diff / 2)) * mapSizeMultiplier; 
    
    emptyCells.sort((a, b) => Math.hypot(a.x - 1, a.y - 1) - Math.hypot(b.x - 1, b.y - 1));

    function getAccessibleCell() {
        if (emptyCells.length === 0) return null;
        let maxIndex = Math.max(1, Math.floor(emptyCells.length * 0.35)); // Mengambil dari area 35% terdekat
        return emptyCells.splice(Math.floor(Math.random() * maxIndex), 1)[0];
    }
    
    function getRandomCell() {
        if (emptyCells.length === 0) return null;
        return emptyCells.splice(Math.floor(Math.random() * emptyCells.length), 1)[0];
    }

    for(let i=0; i<healCount; i++) {
        let base = diff >= 4 ? 19 : 20;
        let id = Math.min(23, base + Math.floor(Math.random() * (2 + bd)));
        if (diff > 4 && Math.random() > 0.8) id = 37; 
        if (diff > 4 && Math.random() > 0.8) id = 38; 
        let cell = getAccessibleCell(); if (cell) state.maze[cell.y][cell.x] = id; 
    }
    for(let i=0; i<shieldCount; i++) { 
        let id = Math.min(25, 24 + Math.floor(Math.random() * (1 + bd)));
        if (diff > 4 && Math.random() > 0.7) id = 30 + Math.floor(Math.random() * 3); 
        let cell = getAccessibleCell(); if (cell) state.maze[cell.y][cell.x] = id; 
    }
    for(let i=0; i<weaponCount; i++) { 
        let id = Math.min(12, 10 + Math.floor(Math.random() * (2 + bd)));
        let cell = getRandomCell(); if (cell) state.maze[cell.y][cell.x] = id; 
    }
    for(let i=0; i<utilCount; i++) { 
        let id = Math.random() > 0.5 ? 13 + Math.floor(Math.random() * 3) : 16 + Math.floor(Math.random() * 3);
        if (diff > 4 && Math.random() > 0.6) id = 33 + Math.floor(Math.random() * 4); 
        let cell = getRandomCell(); if (cell) state.maze[cell.y][cell.x] = id; 
    }
}

function handleStageClear(playerObj, state) {
    if (window.GameConfig.mode === 'speedrun' && state.stage >= window.GameConfig.maxStage) {
        window.isGameActive = false;
        window.CustomDialog.alert(`SPEEDRUN SELESAI!\nKamu berhasil menamatkan ${window.GameConfig.maxStage} stage!`, "SELAMAT!", () => triggerGameOver());
        return;
    }
    
    let diff = window.GameConfig.diff || 3;
    let bossInterval = diff === 5 ? 5 : (diff >= 3 ? 6 : 7);
    let isBossStage = state.stage % bossInterval === 0;

    if (isBossStage) {
        let orient = window.GameConfig.orientation || 'auto';
        let isPortrait = orient === 'portrait' ? true : (orient === 'landscape' ? false : window.innerHeight > window.innerWidth);
        
        if (window.GameConfig.players === 1) {
            if (isPortrait) { state.height += 4; state.width += 2; }
            else { state.width += 4; state.height += 2; }
        } else {
            state.height += 2; state.width += 2;
        }
        showToast(playerObj, "NEXT REALM", "Membuka Labirin yang Lebih Luas!");
    } else {
        showToast(playerObj, "STAGE CLEAR!", `Naik level!`);
    }

    state.score += 300; state.stage += 1; 

    let nextIsBossStage = state.stage % bossInterval === 0;
    state.maze = generateMaze(state.width, state.height, nextIsBossStage);
    
    state.x = 1; state.y = 1; state.visualX = 1; state.visualY = 1;
    state.teleportAnchor = null; 
    
    let keyIdx = state.inventory.indexOf('key');
    if (keyIdx > -1) state.inventory.splice(keyIdx, 1);
    state.hasKey = false;
    
    populateEntities(state);
    updateStatsUI(playerObj);
}

function initGame(p1Name, p2Name) {
    let diff = window.GameConfig.diff || 3;
    let baseSize = 11 + ((diff - 1) * 2);
    let height = baseSize;
    let width = baseSize;
    
    // PEMBENTUKAN RASIO LABIRIN ADAPTIF UNTUK SOLO MODE
    if (window.GameConfig.players === 1) {
        let orient = window.GameConfig.orientation || 'auto';
        let isPortrait = orient === 'portrait' ? true : (orient === 'landscape' ? false : window.innerHeight > window.innerWidth);
        
        if (isPortrait) {
            height = Math.floor(baseSize * 1.6);
            if (height % 2 === 0) height++;
        } else {
            width = Math.floor(baseSize * 1.6);
            if (width % 2 === 0) width++;
        }
    }

    let screen1 = document.getElementById('p1-screen'); let screen2 = document.getElementById('p2-screen');
    let effectClasses = ['effect-invincible', 'effect-damage', 'effect-heal', 'effect-buff', 'effect-attack'];
    
    if(screen1) effectClasses.forEach(c => screen1.classList.remove(c));
    if(screen2) effectClasses.forEach(c => screen2.classList.remove(c));

    document.getElementById('dead-overlay-p1').classList.add('hidden');
    document.getElementById('dead-overlay-p2').classList.add('hidden');
    document.getElementById('inv-p1').classList.add('hidden');
    document.getElementById('inv-p2').classList.add('hidden');
    document.getElementById('screen-gameover').classList.add('hidden');
    
    let bossHpWrapP1 = document.getElementById('boss-hp-wrap-p1');
    if(bossHpWrapP1) bossHpWrapP1.classList.add('hidden');
    let bossHpWrapP2 = document.getElementById('boss-hp-wrap-p2');
    if(bossHpWrapP2) bossHpWrapP2.classList.add('hidden');

    if (typeof stopMoving === 'function') { stopMoving(1); stopMoving(2); }
    if (window.joysticks) {
        [1, 2].forEach(p => {
            window.joysticks[p].dx = 0; window.joysticks[p].dy = 0; window.joysticks[p].active = false;
            let knob = document.getElementById(window.joysticks[p].knob);
            if (knob) knob.style.transform = 'translate(0px, 0px)';
        });
    }

    if (window.deathTimeout) { clearTimeout(window.deathTimeout); window.deathTimeout = null; }

    let bossInterval = diff === 5 ? 5 : (diff >= 3 ? 6 : 7);
    
    const baseState = () => ({ 
        x: 1, y: 1, visualX: 1, visualY: 1, facingX: 1, facingY: 0, 
        hasKey: false, inventory: [], activeBuffs: [], lightBuff: 0, 
        score: 0, shieldAngle: 0, teleportAnchor: null,
        ...window.PLAYER_BASE_STATE,
        stage: 1, width: width, height: height, bossDefeated: 0, maxInvBonus: 0, resurrectCount: 0,
        isPaused: false, isDead: false, isPromptingResurrect: false, isInvincible: false,
        effects: [], stats: { kills: 0, dmgDealt: 0, dmgTaken: 0 }
    });
    
    window.p1State = { ...baseState(), id: 1, name: p1Name, theme: 'ruins', maze: generateMaze(width, height, 1 % bossInterval === 0) };
    window.p2State = { ...baseState(), id: 2, name: p2Name, theme: 'jungle', maze: generateMaze(width, height, 1 % bossInterval === 0) };
    
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

    // Hentikan sisa loop render dari sesi sebelumnya (jika ada)
    if (window.renderFrameId) {
        cancelAnimationFrame(window.renderFrameId);
    }

    // Deklarasikan fungsi loop menggunakan standar global object
    window.loop = function() {
        let now = performance.now();
        let dt = (now - window.lastFrameTime) / 1000;
        window.lastFrameTime = now;

        if (window.isGameActive) {
            [1, 2].forEach(p => {
                if (p === 2 && window.GameConfig.players === 1) return;
                let state = p === 1 ? window.p1State : window.p2State;
                if (!state) return;

                let regenBuff = state.activeBuffs.find(b => b.regenRate);
                if (regenBuff && state.hp > 0 && !state.isDead) {
                    state.hp = Math.min(typeof getMaxHpCap === "function" ? getMaxHpCap(state) : 100, state.hp + regenBuff.regenRate * dt);
                }

                for(let i = state.activeBuffs.length - 1; i >= 0; i--) {
                    let b = state.activeBuffs[i];
                    b.timeLeft -= dt;
                    if(b.timeLeft <= 0) {
                        if(b.isInvincibility) {
                            state.isInvincible = false;
                            let screen = document.getElementById(`p${p}-screen`);
                            if(screen) screen.classList.remove('effect-invincible');
                        } else {
                            state.atk -= (b.atkBonus || 0);
                            state.def -= (b.defBonus || 0);
                            state.lightBuff -= (b.lightBonus || 0);
                        }
                        showToast(p, "HABIS", `Efek ${b.name} selesai.`);
                        state.activeBuffs.splice(i, 1);
                        updateStatsUI(p); 
                    } else {
                        let el = document.getElementById(`buff-p${p}-${b.id}-${i}`);
                        if(el) { el.style.setProperty('--pct', `${(b.timeLeft / b.maxTime) * 100}%`); }
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
                            
                            let speedMod = 1.0;
                            let speedBuff = state.activeBuffs.find(b => b.speedMod);
                            if (speedBuff) speedMod = speedBuff.speedMod;
                            
                            let speed = 0.08 * speedMod;
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
        // Daftarkan id frame ke global agar bisa dimatikan di sesi berikutnya
        window.renderFrameId = requestAnimationFrame(window.loop);
    };
    
    // Mulai loop baru
    window.renderFrameId = requestAnimationFrame(window.loop);

    function resizeCanvas() {
        let canvas1 = document.getElementById('canvas-p1'); let canvas2 = document.getElementById('canvas-p2');
        if(canvas1 && canvas1.parentElement) {
            canvas1.width = canvas1.parentElement.clientWidth || 300; canvas1.height = canvas1.parentElement.clientHeight || 300;
        }
        if(canvas2 && canvas2.parentElement) {
            canvas2.width = canvas2.parentElement.clientWidth || 300; canvas2.height = canvas2.parentElement.clientHeight || 300;
        }
    }
    
    if (!window.hasResizeListener) {
        window.addEventListener('resize', resizeCanvas);
        window.hasResizeListener = true;
    }
    setTimeout(resizeCanvas, 100); 
}