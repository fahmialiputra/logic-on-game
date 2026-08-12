// enemyAI.js - Advanced AI (Optimized)
function getNextStepBFS(state, startX, startY, targetX, targetY) {
    let sx = Math.round(startX), sy = Math.round(startY);
    let tx = Math.round(targetX), ty = Math.round(targetY);
    if (sx === tx && sy === ty) return null;
    
    let queue = [{x: sx, y: sy, firstStep: null}];
    let visited = new Set();
    visited.add(`${sx},${sy}`);
    let dirs = [[0,-1], [0,1], [-1,0], [1,0]];
    
    while(queue.length > 0) {
        let curr = queue.shift();
        if (curr.x === tx && curr.y === ty) return curr.firstStep;
        for(let d of dirs) {
            let nx = curr.x + d[0], ny = curr.y + d[1];
            if (nx >= 0 && nx < state.width && ny >= 0 && ny < state.height && state.maze[ny][nx] !== 1) {
                let key = `${nx},${ny}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push({x: nx, y: ny, firstStep: curr.firstStep || {x: nx, y: ny}});
                }
            }
        }
    }
    return null;
}

function processContinuousEnemyAI(playerObj, state, dt, isWallFunc) {
    let px = state.x; let py = state.y;
    let isUntargetable = (state.hp <= 0 || state.isDead || state.isPaused || state.isPromptingResurrect);
    let diff = window.GameConfig.diff || 3;
    let exitX = -1, exitY = -1;
    
    for (let y = 0; y < state.height; y++) {
        for (let x = 0; x < state.width; x++) {
            if (state.maze[y][x] === 3) { exitX = x; exitY = y; break; }
        }
        if (exitX !== -1) break;
    }
    
    state.monsters.forEach((m) => {
        if (m.wanderTimer === undefined) m.wanderTimer = 0;
        if (m.wanderTarget === undefined) m.wanderTarget = null;
        if (m.atkCooldown === undefined) m.atkCooldown = 0;
        if (m.healUses === undefined) m.healUses = 0;
        if (m.type === 'boss' && m.bossState === undefined) {
            m.bossState = 'wander'; m.bossIdleTimer = 0; m.wanderCount = 0;
        }
        
        let distToPlayer = Math.hypot(px - m.x, py - m.y);
        let distFromOrigin = Math.hypot(m.x - m.originX, m.y - m.originY);
        if (m.atkCooldown > 0) m.atkCooldown -= dt;
        
        let dbE = window.ENEMY_DB[m.type] || window.ENEMY_DB['beast'];
        let speed = dbE.speed * dt;
        let isRanged = dbE.isRanged || false;
        let aggroRange = diff > 3 ? 4.5 : (isRanged ? 4.5 : 1.5);
        let r = 0.35;
        let atkRange = isRanged ? 3.5 : 0.8;
        
        // EFISIENSI PEMBERSIHAN KODE: Panggil fungsi global agar tidak mengulang logika raycast Line-of-sight
        let hasLOS = distToPlayer <= atkRange ? checkLineOfSight(state, m.x, m.y, px, py) : false;

        // BOSS HEAL
        if (m.type === 'boss' && m.hp < m.maxHp * 0.7 && m.healUses < 3) {
            let bx = Math.round(m.x); let by = Math.round(m.y);
            if (bx >= 0 && bx < state.width && by >= 0 && by < state.height) {
                let tileItem = state.maze[by][bx];
                if ([19,20,21,22,23,37].includes(tileItem)) {
                    m.hp = Math.min(m.maxHp, m.hp + window.ITEM_DB[tileItem].val);
                    m.healUses += 1;
                    state.maze[by][bx] = 0; 
                    addVisualEffect(state, bx, by, '💚', 'normal');
                }
            }
        }

        // 1. AREA SERANG
        if (!isUntargetable && distToPlayer <= atkRange && hasLOS) {
            if (m.atkCooldown <= 0) {
                m.atkCooldown = 1.0; 
                let mAtk = m.atk;
                if(m.type === 'dark' && state.lightBuff === 0) mAtk += 15;
                let baseDmg = Math.max(0, mAtk - state.def);
                
                if (state.isInvincible || state.activeBuffs.some(b => b.isInvincibility)) {
                    baseDmg = 0;
                } else {
                    let parryBuff = state.activeBuffs.find(b => b.isParry);
                    if (parryBuff && Math.random() < parryBuff.parryChance) {
                        baseDmg = 0; showToast(playerObj, "PARRY!", "Serangan ditangkis!");
                    } else {
                        let reflectBuff = state.activeBuffs.find(b => b.isReflect);
                        if (reflectBuff && Math.random() < reflectBuff.reflectChance) {
                            baseDmg = 0;
                            if (m.type === 'boss') m.hp = Math.max(1, m.hp - mAtk);
                            else { m.hp -= mAtk; if (m.hp <= 0) m.isDeadFlag = true; }
                            showToast(playerObj, "REFLECT!", `Musuh kena DMG`);
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
                
                let atkEff = dbE ? dbE.atkEffect : '💥';
                addVisualEffect(state, px, py, atkEff, 'enemy_attack');
                if (baseDmg > 0) triggerEffect(playerObj, 'damage');
                
                updateStatsUI(playerObj);
                if (checkDeath(playerObj, state, m.name)) return;
            }
        } 
        // 2. BOSS AI (Optimized Pathfinding & LOS)
        else if (m.type === 'boss') {
            let bossAggro = Math.hypot(state.width, state.height) * 0.45;
            
            if (!isUntargetable && distToPlayer <= bossAggro) {
                let bossLOS = checkLineOfSight(state, m.x, m.y, px, py);
                
                if (bossLOS) {
                    if (distToPlayer > 0.05) {
                        let dx = (px - m.x) / distToPlayer; let dy = (py - m.y) / distToPlayer;
                        let nextX = m.x + dx * speed; let nextY = m.y + dy * speed;
                        if (!isWallFunc(state, nextX - r, m.y - r) && !isWallFunc(state, nextX + r, m.y - r) && !isWallFunc(state, nextX - r, m.y + r) && !isWallFunc(state, nextX + r, m.y + r)) m.x = nextX;
                        if (!isWallFunc(state, m.x - r, nextY - r) && !isWallFunc(state, m.x + r, nextY - r) && !isWallFunc(state, m.x - r, nextY + r) && !isWallFunc(state, m.x + r, nextY + r)) m.y = nextY;
                    }
                    m.bfsTarget = null;
                } else {
                    if (m.pathTimer === undefined) m.pathTimer = 0;
                    m.pathTimer -= dt;
                    if (m.pathTimer <= 0 || !m.bfsTarget) {
                        m.bfsTarget = getNextStepBFS(state, m.x, m.y, px, py);
                        m.pathTimer = 0.3; 
                    }
                    if (m.bfsTarget) {
                        let tx = m.bfsTarget.x; let ty = m.bfsTarget.y;
                        let wDist = Math.hypot(tx - m.x, ty - m.y);
                        if (wDist > 0.05) {
                            let dx = (tx - m.x) / wDist; let dy = (ty - m.y) / wDist;
                            let nextX = m.x + dx * speed; let nextY = m.y + dy * speed;
                            if (!isWallFunc(state, nextX - r, m.y - r) && !isWallFunc(state, nextX + r, m.y - r) && !isWallFunc(state, nextX - r, m.y + r) && !isWallFunc(state, nextX + r, m.y + r)) m.x = nextX;
                            if (!isWallFunc(state, m.x - r, nextY - r) && !isWallFunc(state, m.x + r, nextY - r) && !isWallFunc(state, m.x - r, nextY + r) && !isWallFunc(state, m.x + r, nextY + r)) m.y = nextY;
                        } else {
                            m.bfsTarget = null;
                            m.pathTimer = 0; 
                        }
                    }
                }
                m.wanderTarget = null;
                m.bossState = 'wander';
            } else {
                if (m.bossState === 'idle') {
                    m.bossIdleTimer -= dt;
                    if (m.bossIdleTimer <= 0) { m.bossState = 'wander'; m.wanderTarget = null; }
                } else if (m.bossState === 'returning') {
                    if (distFromOrigin < 0.25) {
                        m.bossState = 'idle';
                        m.bossIdleTimer = 15 + Math.random() * 15;
                    } else {
                        if (distFromOrigin > 0.05) {
                            let dx = (m.originX - m.x) / distFromOrigin; let dy = (m.originY - m.y) / distFromOrigin;
                            let nextX = m.x + dx * speed; let nextY = m.y + dy * speed;
                            if (!isWallFunc(state, nextX - r, m.y - r) && !isWallFunc(state, nextX + r, m.y - r) && !isWallFunc(state, nextX - r, m.y + r) && !isWallFunc(state, nextX + r, m.y + r)) m.x = nextX;
                            if (!isWallFunc(state, m.x - r, nextY - r) && !isWallFunc(state, m.x + r, nextY - r) && !isWallFunc(state, m.x - r, nextY + r) && !isWallFunc(state, m.x + r, nextY + r)) m.y = nextY;
                        }
                    }
                } else if (m.bossState === 'wander') {
                    if (!m.wanderTarget || Math.hypot(m.wanderTarget.x - m.x, m.wanderTarget.y - m.y) < 0.3) {
                        let openTiles = [];
                        for (let y = 1; y < state.height - 1; y++) {
                            for (let x = 1; x < state.width - 1; x++) {
                                if (state.maze[y][x] === 0 && Math.hypot(x - exitX, y - exitY) > 4.5) openTiles.push({x, y});
                            }
                        }
                        if (openTiles.length > 0 && m.wanderCount < 5) {
                            m.wanderTarget = openTiles[Math.floor(Math.random() * openTiles.length)];
                            m.wanderCount++;
                        } else {
                            m.bossState = 'returning'; m.wanderCount = 0; m.wanderTarget = null;
                        }
                    }
                    if (m.wanderTarget) {
                        let wDist = Math.hypot(m.wanderTarget.x - m.x, m.wanderTarget.y - m.y);
                        if (wDist > 0.05) {
                            let dx = (m.wanderTarget.x - m.x) / wDist; let dy = (m.wanderTarget.y - m.y) / wDist;
                            let nextX = m.x + dx * speed; let nextY = m.y + dy * speed;
                            if (!isWallFunc(state, nextX - r, m.y - r) && !isWallFunc(state, nextX + r, m.y - r) && !isWallFunc(state, nextX - r, m.y + r) && !isWallFunc(state, nextX + r, m.y + r)) m.x = nextX;
                            if (!isWallFunc(state, m.x - r, nextY - r) && !isWallFunc(state, m.x + r, nextY - r) && !isWallFunc(state, m.x - r, nextY + r) && !isWallFunc(state, m.x + r, nextY + r)) m.y = nextY;
                        }
                    }
                }
            }
        } 
        // 3. NORMAL MONSTER AI
        else {
            if (!isUntargetable && distToPlayer <= aggroRange && distFromOrigin <= aggroRange * 2) {
                let shouldMove = !(isRanged && hasLOS && distToPlayer <= atkRange - 0.5);
                if (distToPlayer > 0.05 && shouldMove) {
                    let dx = (px - m.x) / distToPlayer; let dy = (py - m.y) / distToPlayer;
                    let nextX = m.x + dx * speed; let nextY = m.y + dy * speed;
                    if (!isWallFunc(state, nextX - r, m.y - r) && !isWallFunc(state, nextX + r, m.y - r) && !isWallFunc(state, nextX - r, m.y + r) && !isWallFunc(state, nextX + r, m.y + r)) m.x = nextX;
                    if (!isWallFunc(state, m.x - r, nextY - r) && !isWallFunc(state, m.x + r, nextY - r) && !isWallFunc(state, m.x - r, nextY + r) && !isWallFunc(state, m.x + r, nextY + r)) m.y = nextY;
                }
                m.wanderTarget = null;
            } else {
                if (!m.wanderTarget || Math.hypot(m.wanderTarget.x - m.x, m.wanderTarget.y - m.y) < 0.2) {
                    m.wanderTimer -= dt;
                    if (m.wanderTimer <= 0) {
                        m.wanderTimer = 1.0 + Math.random() * 2.0; 
                        let dirs = [[0,-1], [0,1], [-1,0], [1,0]]; 
                        let validDirs = dirs.filter(d => {
                            let tx = Math.round(m.x) + d[0]; let ty = Math.round(m.y) + d[1];
                            let safeZone = Math.hypot(tx - m.originX, ty - m.originY) <= aggroRange;
                            return !isWallFunc(state, tx, ty) && safeZone;
                        });
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
                    if (wDist > 0.05) {
                        let dx = (m.wanderTarget.x - m.x) / wDist; let dy = (m.wanderTarget.y - m.y) / wDist;
                        let nextX = m.x + dx * (speed * 0.45); let nextY = m.y + dy * (speed * 0.45);
                        if (!isWallFunc(state, nextX - r, m.y - r) && !isWallFunc(state, nextX + r, m.y - r) && !isWallFunc(state, nextX - r, m.y + r) && !isWallFunc(state, nextX + r, m.y + r)) m.x = nextX;
                        if (!isWallFunc(state, m.x - r, nextY - r) && !isWallFunc(state, m.x + r, nextY - r) && !isWallFunc(state, m.x - r, nextY + r) && !isWallFunc(state, m.x + r, nextY + r)) m.y = nextY;
                    }
                }
            }
        }
        m.visualX = m.x; m.visualY = m.y;
    });
    
    state.monsters = state.monsters.filter(m => !m.isDeadFlag);
}