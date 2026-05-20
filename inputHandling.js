// inputHandling.js - Pengontrol Joypad, D-pad dan Interaksi Tombol Cepat

window.joysticks = {
    1: { dx: 0, dy: 0, active: false, pad: 'analog-1', knob: 'knob-1' },
    2: { dx: 0, dy: 0, active: false, pad: 'analog-2', knob: 'knob-2' }
};

let moveTimeouts = { 1: null, 2: null };
let moveIntervals = { 1: null, 2: null };

function setupJoysticks() {
    [1, 2].forEach(p => {
        let pad = document.getElementById(window.joysticks[p].pad);
        let knob = document.getElementById(window.joysticks[p].knob);
        if (!pad) return;

        pad.addEventListener('pointerdown', (e) => {
            let state = p == 1 ? window.p1State : window.p2State;
            if(!window.isGameActive || state.hp <= 0 || state.isDead || state.isPaused || state.isPromptingResurrect) return;
            window.joysticks[p].active = true;
            pad.setPointerCapture(e.pointerId);
            moveJoy(e);
        });
        pad.addEventListener('pointermove', moveJoy);
        pad.addEventListener('pointerup', stopJoy);
        pad.addEventListener('pointercancel', stopJoy);

        function moveJoy(e) {
            if (!window.joysticks[p].active) return;
            let rect = pad.getBoundingClientRect();
            let cx = rect.left + rect.width/2;
            let cy = rect.top + rect.height/2;
            let dx = e.clientX - cx; let dy = e.clientY - cy;
            let dist = Math.sqrt(dx*dx + dy*dy);
            let maxDist = rect.width/2 - knob.offsetWidth/2;

            if (dist > maxDist) { dx = (dx/dist) * maxDist; dy = (dy/dist) * maxDist; }
            knob.style.transform = `translate(${dx}px, ${dy}px)`;
            window.joysticks[p].dx = dx / maxDist; window.joysticks[p].dy = dy / maxDist;
        }
        function stopJoy(e) {
            window.joysticks[p].active = false;
            window.joysticks[p].dx = 0; window.joysticks[p].dy = 0;
            knob.style.transform = `translate(0px, 0px)`;
            pad.releasePointerCapture(e.pointerId);
        }
    });
}

function movePlayer(playerObj, dir) {
    let state = playerObj == 1 ? window.p1State : window.p2State;
    if (state.hp <= 0 || state.isDead || !window.isGameActive || state.isPaused || state.isPromptingResurrect || window.GameConfig.smooth) return; 
    
    let nextX = Math.round(state.x); let nextY = Math.round(state.y);
    
    // UPDATE HADAP KETIKA MEMENCET TOMBOL D-PAD
    if (dir === 'up') { nextY--; state.facingX = 0; state.facingY = -1; }
    else if (dir === 'down') { nextY++; state.facingX = 0; state.facingY = 1; }
    else if (dir === 'left') { nextX--; state.facingX = -1; state.facingY = 0; }
    else if (dir === 'right') { nextX++; state.facingX = 1; state.facingY = 0; }
    
    if (nextX >= 0 && nextX < state.width && nextY >= 0 && nextY < state.height) {
        let targetCell = state.maze[nextY][nextX];
        
        // Pengecekan Tubrukan Tubuh Kasar (Hit-box Radius Kecil) 
        let hasMonster = state.monsters.some(m => Math.hypot(nextX - m.x, nextY - m.y) <= 0.85);
        
        if (hasMonster) {
            // Sengaja menabrak monster langsung memicu serangan otomatis tanpa mencet serang 
            attackEnemy(playerObj); 
        }
        else if (targetCell !== 1) { 
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
    if (!window.isGameActive || typeof e.target.closest !== 'function') return;
    
    let btn = e.target.closest('.dpad-btn, .action-grab, .action-inv, .action-attack');
    if (!btn) return;
    e.preventDefault();
    
    const player = btn.dataset.player;
    if (btn.classList.contains('action-grab')) grabItem(player);
    else if (btn.classList.contains('action-attack')) attackEnemy(player);
    else if (btn.classList.contains('action-inv')) {
        let state = player == 1 ? window.p1State : window.p2State;
        if (state.isPaused && state.hp === 1) showToast(player, "KRITIS!", "Wajib pakai pemulih/pelindung!");
        else document.getElementById(`inv-p${player}`).classList.toggle('hidden');
    }
    else if (btn.classList.contains('dpad-btn')) {
        const dir = btn.dataset.dir;
        if (player && dir) startMoving(player, dir);
    }
});

document.addEventListener('pointerup', (e) => {
    if (typeof e.target.closest !== 'function') { stopMoving(1); stopMoving(2); return; }
    
    let btn = e.target.closest('.dpad-btn');
    if (btn) stopMoving(btn.dataset.player);
    else { stopMoving(1); stopMoving(2); }
});

document.addEventListener('pointerleave', (e) => {
    if (typeof e.target.closest !== 'function') return;
    
    let btn = e.target.closest('.dpad-btn');
    if (btn) stopMoving(btn.dataset.player);
});