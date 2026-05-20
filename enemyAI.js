// enemyAI.js - Wandering AI and Synced Aggro Range

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
        let aggroRange = diff > 3 ? 4.5 : 1.5; // Radius aggro WAJIB seimbang dengan ukuran Lingkaran Merah UI
        
        let r = 0.35; // Radius Badan Tabrakan

        if (!isUntargetable && distToPlayer <= 0.8) {
            // 1. Eksekusi Area Serangan Jarak Dekat Musuh
            if (m.atkCooldown <= 0) {
                m.atkCooldown = 1.0; 
                let mAtk = m.atk;
                if(m.type === 'dark' && state.lightBuff === 0) mAtk += 15;
                let baseDmg = Math.max(0, mAtk - state.def);
                if (state.isInvincible) baseDmg = 0; 
                
                let dmgToPlayer = baseDmg;
                if (dmgToPlayer > 0 && state.shield > 0) {
                    if (state.shield >= dmgToPlayer) { state.shield -= dmgToPlayer; dmgToPlayer = 0; } 
                    else { dmgToPlayer -= state.shield; state.shield = 0; }
                }
                state.hp -= dmgToPlayer;
                state.stats.dmgTaken += baseDmg;
                
                addVisualEffect(state, px, py, m.type === 'dark' ? '🦇' : '爪', 'enemy_attack');
                if (!state.isInvincible) triggerEffect(playerObj, 'damage');
                
                updateStatsUI(playerObj);
                
                if (checkDeath(playerObj, state, m.name)) return;
                else if (state.hp > 0 && !state.isPaused) {
                    let msg = state.isInvincible ? "KEBAL!" : (dmgToPlayer === 0 && baseDmg > 0 ? `Shield nahan ${baseDmg} DMG` : `-${dmgToPlayer} HP`);
                    showToast(playerObj, "AWAS!", msg);
                }
            }
        } 
        else if (!isUntargetable && distToPlayer <= aggroRange) {
            // 2. Chasing Player (Musuh Menemukan Pemain)
            let dx = (px - m.x) / distToPlayer; let dy = (py - m.y) / distToPlayer;
            let nextX = m.x + dx * speed; let nextY = m.y + dy * speed;
            
            if (!isWallFunc(state, nextX - r, m.y - r) && !isWallFunc(state, nextX + r, m.y - r) && !isWallFunc(state, nextX - r, m.y + r) && !isWallFunc(state, nextX + r, m.y + r)) m.x = nextX;
            if (!isWallFunc(state, m.x - r, nextY - r) && !isWallFunc(state, m.x + r, nextY - r) && !isWallFunc(state, m.x - r, nextY + r) && !isWallFunc(state, m.x + r, nextY + r)) m.y = nextY;
            
            m.wanderTarget = null; // Batalkan area patroli jika agresif
        } 
        else {
            // 3. Sistem AI Berkeliaran (Wandering)
            if (!m.wanderTarget || Math.hypot(m.wanderTarget.x - m.x, m.wanderTarget.y - m.y) < 0.2) {
                m.wanderTimer -= dt;
                if (m.wanderTimer <= 0) {
                    m.wanderTimer = 1.0 + Math.random() * 2.0; 
                    let dirs = [[0,-1], [0,1], [-1,0], [1,0]]; // Acak satu arah Tile kosong
                    let validDirs = dirs.filter(d => !isWallFunc(state, Math.round(m.x) + d[0], Math.round(m.y) + d[1]));
                    
                    if (validDirs.length > 0) {
                        let d = validDirs[Math.floor(Math.random() * validDirs.length)];
                        m.wanderTarget = { x: Math.round(m.x) + d[0], y: Math.round(m.y) + d[1] };
                    } else {
                        m.wanderTarget = { x: m.originX, y: m.originY }; 
                    }
                }
            }
            
            // Bergerak perlahan ke posisi wandering target
            if (m.wanderTarget) {
                let wDist = Math.hypot(m.wanderTarget.x - m.x, m.wanderTarget.y - m.y);
                if (wDist > 0.1) {
                    let wSpeed = speed * 0.4; // Berjalan lebih pelan
                    let dx = (m.wanderTarget.x - m.x) / wDist; let dy = (m.wanderTarget.y - m.y) / wDist;
                    let nextX = m.x + dx * wSpeed; let nextY = m.y + dy * wSpeed;
                    
                    if (!isWallFunc(state, nextX - r, m.y - r) && !isWallFunc(state, nextX + r, m.y - r) && !isWallFunc(state, nextX - r, m.y + r) && !isWallFunc(state, nextX + r, m.y + r)) m.x = nextX;
                    if (!isWallFunc(state, m.x - r, nextY - r) && !isWallFunc(state, m.x + r, nextY - r) && !isWallFunc(state, m.x - r, nextY + r) && !isWallFunc(state, m.x + r, nextY + r)) m.y = nextY;
                }
            }
        }
        
        m.visualX = m.x; m.visualY = m.y;
    });
}