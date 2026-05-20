function processContinuousEnemyAI(playerObj, state, dt, isWallFunc) {
    let px = state.x; let py = state.y;
    let isUntargetable = (state.hp <= 0 || state.isDead || state.isPaused || state.isPromptingResurrect);
    let diff = window.GameConfig.diff || 3;

    state.monsters.forEach((m) => {
        if (m.x === undefined) { 
            m.x = m.originX; m.y = m.originY; m.visualX = m.x; m.visualY = m.y; 
            m.atkCooldown = 0; m.wanderTimer = 0; m.wanderTarget = null;
        }
        
        let distToPlayer = Math.hypot(px - m.x, py - m.y);
        if (m.atkCooldown > 0) m.atkCooldown -= dt;

        let speed = (m.type === 'boss' ? 1.4 : (m.type === 'dark' ? 2.5 : 1.8)) * dt;
        
        // Peningkatan Radius Deteksi Boss 30% dari skala Labirin
        let aggroRange = diff > 3 ? 4.5 : 1.5; 
        if (m.type === 'boss') aggroRange = Math.hypot(state.width, state.height) * 0.3;

        let r = 0.35; 

        // BOSS HEALING LOGIC
        if (m.type === 'boss' && m.hp < m.maxHp * 0.7 && (m.healUses || 0) < 3) {
            let bx = Math.round(m.x); let by = Math.round(m.y);
            if (bx >= 0 && bx < state.width && by >= 0 && by < state.height) {
                let tileItem = state.maze[by][bx];
                if ([19,20,21,22,23,37].includes(tileItem)) {
                    let healVal = window.ITEM_DB[tileItem].val;
                    m.hp = Math.min(m.maxHp, m.hp + healVal);
                    m.healUses = (m.healUses || 0) + 1;
                    state.maze[by][bx] = 0; 
                    addVisualEffect(state, bx, by, '💚', 'normal');
                }
            }
        }

        if (!isUntargetable && distToPlayer <= 0.8) {
            if (m.atkCooldown <= 0) {
                m.atkCooldown = 1.0; 
                let mAtk = m.atk;
                if(m.type === 'dark' && state.lightBuff === 0) mAtk += 15;
                let baseDmg = Math.max(0, mAtk - state.def);
                
                // CEK BUFF EPIC PEMAIN
                if (state.isInvincible || state.activeBuffs.some(b => b.isInvincibility)) {
                    baseDmg = 0;
                } else {
                    let parryBuff = state.activeBuffs.find(b => b.isParry);
                    if (parryBuff && Math.random() < parryBuff.parryChance) {
                        baseDmg = 0; showToast(playerObj, "PARRY!", "Serangan ditangkis!");
                    } else {
                        let reflectBuff = state.activeBuffs.find(b => b.isReflect);
                        if (reflectBuff && Math.random() < reflectBuff.reflectChance) {
                            baseDmg = 0; m.hp -= mAtk; // Kembalikan damage
                            showToast(playerObj, "REFLECT!", `Musuh kena ${mAtk} DMG`);
                            if (m.hp <= 0) m.isDeadFlag = true;
                        }
                    }
                }

                let dmgToPlayer = baseDmg;
                if (dmgToPlayer > 0 && state.shield > 0) {
                    if (state.shield >= dmgToPlayer) { state.shield -= dmgToPlayer; dmgToPlayer = 0; } 
                    else { dmgToPlayer -= state.shield; state.shield = 0; }
                }
                state.hp -= dmgToPlayer;
                state.stats.dmgTaken += baseDmg;
                
                addVisualEffect(state, px, py, m.type === 'dark' ? '🦇' : '爪', 'enemy_attack');
                if (baseDmg > 0) triggerEffect(playerObj, 'damage');
                
                updateStatsUI(playerObj);
                
                if (checkDeath(playerObj, state, m.name)) return;
                else if (state.hp > 0 && !state.isPaused && baseDmg > 0) {
                    showToast(playerObj, "AWAS!", `-${dmgToPlayer} HP`);
                }
            }
        } 
        else if (!isUntargetable && distToPlayer <= aggroRange) {
            let dx = (px - m.x) / distToPlayer; let dy = (py - m.y) / distToPlayer;
            let nextX = m.x + dx * speed; let nextY = m.y + dy * speed;
            
            if (!isWallFunc(state, nextX - r, m.y - r) && !isWallFunc(state, nextX + r, m.y - r) && !isWallFunc(state, nextX - r, m.y + r) && !isWallFunc(state, nextX + r, m.y + r)) m.x = nextX;
            if (!isWallFunc(state, m.x - r, nextY - r) && !isWallFunc(state, m.x + r, nextY - r) && !isWallFunc(state, m.x - r, nextY + r) && !isWallFunc(state, m.x + r, nextY + r)) m.y = nextY;
            
            m.wanderTarget = null;
        } 
        else {
            if (!m.wanderTarget || Math.hypot(m.wanderTarget.x - m.x, m.wanderTarget.y - m.y) < 0.2) {
                m.wanderTimer -= dt;
                if (m.wanderTimer <= 0) {
                    m.wanderTimer = 1.0 + Math.random() * 2.0; 
                    let dirs = [[0,-1], [0,1], [-1,0], [1,0]]; 
                    let validDirs = dirs.filter(d => !isWallFunc(state, Math.round(m.x) + d[0], Math.round(m.y) + d[1]));
                    
                    if (validDirs.length > 0) {
                        let d = validDirs[Math.floor(Math.random() * validDirs.length)];
                        m.wanderTarget = { x: Math.round(m.x) + d[0], y: Math.round(m.y) + d[1] };
                    } else {
                        m.wanderTarget = { x: m.originX, y: m.originY }; 
                    }
                }
            }
            
            if (m.wanderTarget) {
                let wDist = Math.hypot(m.wanderTarget.x - m.x, m.wanderTarget.y - m.y);
                if (wDist > 0.1) {
                    let wSpeed = speed * 0.4; 
                    let dx = (m.wanderTarget.x - m.x) / wDist; let dy = (m.wanderTarget.y - m.y) / wDist;
                    let nextX = m.x + dx * wSpeed; let nextY = m.y + dy * wSpeed;
                    
                    if (!isWallFunc(state, nextX - r, m.y - r) && !isWallFunc(state, nextX + r, m.y - r) && !isWallFunc(state, nextX - r, m.y + r) && !isWallFunc(state, nextX + r, m.y + r)) m.x = nextX;
                    if (!isWallFunc(state, m.x - r, nextY - r) && !isWallFunc(state, m.x + r, nextY - r) && !isWallFunc(state, m.x - r, nextY + r) && !isWallFunc(state, m.x + r, nextY + r)) m.y = nextY;
                }
            }
        }
        
        m.visualX = m.x; m.visualY = m.y;
    });

    state.monsters = state.monsters.filter(m => !m.isDeadFlag);
}