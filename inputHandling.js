window.joysticks = {
    1: { dx: 0, dy: 0, active: false, isTouch: false, pad: 'analog-1', knob: 'knob-1' },
    2: { dx: 0, dy: 0, active: false, isTouch: false, pad: 'analog-2', knob: 'knob-2' }
};

let moveTimeouts = { 1: null, 2: null };
let moveIntervals = { 1: null, 2: null };
let gpMoveState = { 1: null, 2: null };
const keyState = { 
    1: { up: false, down: false, left: false, right: false }, 
    2: { up: false, down: false, left: false, right: false } 
};

window.toggleInventory = function(p) {
    let state = p == 1 ? window.p1State : window.p2State;
    let invEl = document.getElementById(`inv-p${p}`);
    
    state.isInvOpen = !state.isInvOpen;
    if (state.isInvOpen) {
        invEl.classList.remove('hidden');
        state.invSelection = 0; // Mulai dari awal indeks
    } else {
        invEl.classList.add('hidden');
    }
    if (typeof updateStatsUI === 'function') updateStatsUI(p);
};

window.navigateInventory = function(p, dir) {
    let state = p == 1 ? window.p1State : window.p2State;
    if (!state.isInvOpen) return false;
    
    let maxItems = state.inventory.length;
    if (maxItems === 0) return true;

    let cols = 4; 

    if (dir === 'left') state.invSelection--;
    if (dir === 'right') state.invSelection++;
    if (dir === 'up') state.invSelection -= cols;
    if (dir === 'down') state.invSelection += cols;

    if (state.invSelection < 0) state.invSelection = 0;
    if (state.invSelection >= maxItems) state.invSelection = maxItems - 1;

    updateStatsUI(p);
    return true;
};

window.executeInventory = function(p) {
    let state = p == 1 ? window.p1State : window.p2State;
    if (!state.isInvOpen) return false;
    
    if (state.inventory.length > 0 && state.invSelection >= 0 && state.invSelection < state.inventory.length) {
        useItem(p, state.invSelection);
    }
    return true;
};

function setupJoysticks() {
    [1, 2].forEach(p => {
        let pad = document.getElementById(window.joysticks[p].pad);
        let knob = document.getElementById(window.joysticks[p].knob);
        if (!pad) return;
        pad.addEventListener('pointerdown', (e) => {
            let confP = p == 1 ? window.GameConfig.inputP1 : window.GameConfig.inputP2;
            if(confP !== 'touch') return; // Blokir aksi jika bukan Mode Sentuh

            let state = p == 1 ? window.p1State : window.p2State;
            if(!window.isGameActive || state.hp <= 0 || state.isDead || state.isPaused) return;
            window.joysticks[p].active = true;
            window.joysticks[p].isTouch = true;
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
            window.joysticks[p].isTouch = false;
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
    if (dir === 'up') { nextY--; state.facingX = 0; state.facingY = -1; }
    else if (dir === 'down') { nextY++; state.facingX = 0; state.facingY = 1; }
    else if (dir === 'left') { nextX--; state.facingX = -1; state.facingY = 0; }
    else if (dir === 'right') { nextX++; state.facingX = 1; state.facingY = 0; }
    
    if (nextX >= 0 && nextX < state.width && nextY >= 0 && nextY < state.height) {
        let targetCell = state.maze[nextY][nextX];
        let hasMonster = state.monsters.some(m => Math.hypot(nextX - m.x, nextY - m.y) <= 0.85);
        if (hasMonster) {
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
    
    const player = btn.dataset.player;
    let confP = player == 1 ? window.GameConfig.inputP1 : window.GameConfig.inputP2;
    if(confP !== 'touch') return; // Memblokir button virtual jika bukan diset Touch

    e.preventDefault();
    if (btn.classList.contains('action-grab')) grabItem(player);
    else if (btn.classList.contains('action-attack')) attackEnemy(player);
    else if (btn.classList.contains('action-inv')) window.toggleInventory(player);
    else if (btn.classList.contains('dpad-btn')) {
        const dir = btn.dataset.dir;
        if (player && dir) startMoving(player, dir);
    }
});

document.addEventListener('pointerup', (e) => {
    if (typeof e.target.closest !== 'function') { stopMoving(1); stopMoving(2); return; }
    let btn = e.target.closest('.dpad-btn');
    if (btn) stopMoving(btn.dataset.player);
});

let lastButtons = { 1: [], 2: [] };

function pollGamepads() {
    if (!window.isGameActive) {
        requestAnimationFrame(pollGamepads);
        return;
    }

    let gps = navigator.getGamepads ? navigator.getGamepads() : [];
    let gpAssignedP1 = false;
    let gpAssignedP2 = false;

    [1, 2].forEach(p => {
        if (!window.joysticks[p].isTouch && window.GameConfig.smooth) {
            window.joysticks[p].dx = 0; window.joysticks[p].dy = 0; window.joysticks[p].active = false;
        }
    });

    for (let i = 0; i < gps.length; i++) {
        let gp = gps[i];
        if (!gp) continue;
        
        let p = null;
        if (window.GameConfig.inputP1 === 'gamepad' && !gpAssignedP1) { p = 1; gpAssignedP1 = true; }
        else if (window.GameConfig.inputP2 === 'gamepad' && window.GameConfig.players > 1 && !gpAssignedP2) { p = 2; gpAssignedP2 = true; }
        if (!p) continue;
        
        let state = p == 1 ? window.p1State : window.p2State;
        // Pengecualian: Boleh memproses event Gamepad walau sedang Pause, khusus untuk Healing (HP = 1)
        let canInput = state && !state.isDead && (!state.isPaused || (state.hp === 1 && state.isPaused));
        if (!canInput) continue;
        
        let dx = Math.abs(gp.axes[0]) > 0.2 ? gp.axes[0] : 0;
        let dy = Math.abs(gp.axes[1]) > 0.2 ? gp.axes[1] : 0;
        let currentBtn = gp.buttons;

        if (currentBtn[12] && currentBtn[12].pressed) dy = -1;
        if (currentBtn[13] && currentBtn[13].pressed) dy = 1;
        if (currentBtn[14] && currentBtn[14].pressed) dx = -1;
        if (currentBtn[15] && currentBtn[15].pressed) dx = 1;

        if (!lastButtons[p] || lastButtons[p].length === 0) lastButtons[p] = new Array(currentBtn.length).fill(false);
        const isPressed = (bIdx) => currentBtn[bIdx] && currentBtn[bIdx].pressed && !lastButtons[p][bIdx];

        if (isPressed(3) || isPressed(9)) window.toggleInventory(p); // Y atau START

        if (state.isInvOpen) {
            if (isPressed(12) || (dy < -0.5 && gpMoveState[p] !== 'up')) { window.navigateInventory(p, 'up'); gpMoveState[p] = 'up'; }
            else if (isPressed(13) || (dy > 0.5 && gpMoveState[p] !== 'down')) { window.navigateInventory(p, 'down'); gpMoveState[p] = 'down'; }
            else if (isPressed(14) || (dx < -0.5 && gpMoveState[p] !== 'left')) { window.navigateInventory(p, 'left'); gpMoveState[p] = 'left'; }
            else if (isPressed(15) || (dx > 0.5 && gpMoveState[p] !== 'right')) { window.navigateInventory(p, 'right'); gpMoveState[p] = 'right'; }
            else if (Math.abs(dx) < 0.2 && Math.abs(dy) < 0.2) gpMoveState[p] = null;

            if (isPressed(0)) window.executeInventory(p); // Pakai item
            if (isPressed(1)) window.toggleInventory(p); // Tutup Tas via 'B'

        } else if (!state.isPaused) {
            if (window.GameConfig.smooth) {
                if (dx !== 0 || dy !== 0) {
                    let dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist > 1) { dx /= dist; dy /= dist; }
                    window.joysticks[p].dx = dx; window.joysticks[p].dy = dy; window.joysticks[p].active = true;
                }
            } else {
                let dir = null;
                if (dy < -0.5) dir = 'up'; else if (dy > 0.5) dir = 'down';
                else if (dx < -0.5) dir = 'left'; else if (dx > 0.5) dir = 'right';
                
                if (dir !== gpMoveState[p]) {
                    if (gpMoveState[p]) stopMoving(p);
                    if (dir) startMoving(p, dir);
                    gpMoveState[p] = dir;
                }
            }
            if (isPressed(0)) attackEnemy(p);
            if (isPressed(1) || isPressed(2)) grabItem(p);
        }
        for(let b = 0; b < currentBtn.length; b++) lastButtons[p][b] = currentBtn[b].pressed;
    }

    [1, 2].forEach(p => {
        let confP = p == 1 ? window.GameConfig.inputP1 : window.GameConfig.inputP2;
        if(confP === 'keyboard' && window.GameConfig.smooth && !window.joysticks[p].active) {
            let state = p == 1 ? window.p1State : window.p2State;
            if (!state || state.isDead || state.isPaused || state.isInvOpen) return;
            
            let kDx = 0, kDy = 0;
            if (keyState[p].left) kDx = -1;
            if (keyState[p].right) kDx = 1;
            if (keyState[p].up) kDy = -1;
            if (keyState[p].down) kDy = 1;

            if (kDx !== 0 || kDy !== 0) {
                let dist = Math.sqrt(kDx*kDx + kDy*kDy);
                window.joysticks[p].dx = kDx / dist;
                window.joysticks[p].dy = kDy / dist;
                window.joysticks[p].active = true;
            }
        }
    });

    requestAnimationFrame(pollGamepads);
}
requestAnimationFrame(pollGamepads);

const activeKeys = new Set();
document.addEventListener('keydown', (e) => {
    if (!window.isGameActive || activeKeys.has(e.code)) return;
    activeKeys.add(e.code);
    
    let s1 = window.p1State; let s2 = window.p2State;
    let canP1 = s1 && !s1.isDead && (!s1.isPaused || (s1.hp === 1 && s1.isPaused));
    let canP2 = s2 && !s2.isDead && (!s2.isPaused || (s2.hp === 1 && s2.isPaused));

    if (canP1 && window.GameConfig.inputP1 === 'keyboard') {
        if (e.code === 'KeyQ' || e.code === 'KeyY') window.toggleInventory(1);

        if (s1.isInvOpen) {
            if (e.code === 'KeyW' || e.code === 'ArrowUp') window.navigateInventory(1, 'up');
            if (e.code === 'KeyS' || e.code === 'ArrowDown') window.navigateInventory(1, 'down');
            if (e.code === 'KeyA' || e.code === 'ArrowLeft') window.navigateInventory(1, 'left');
            if (e.code === 'KeyD' || e.code === 'ArrowRight') window.navigateInventory(1, 'right');
            if (e.code === 'Space' || e.code === 'Enter') window.executeInventory(1);
        } else if (!s1.isPaused) {
            if (e.code === 'KeyW') { keyState[1].up = true; if(!window.GameConfig.smooth) startMoving(1, 'up'); }
            if (e.code === 'KeyS') { keyState[1].down = true; if(!window.GameConfig.smooth) startMoving(1, 'down'); }
            if (e.code === 'KeyA') { keyState[1].left = true; if(!window.GameConfig.smooth) startMoving(1, 'left'); }
            if (e.code === 'KeyD') { keyState[1].right = true; if(!window.GameConfig.smooth) startMoving(1, 'right'); }
            if (e.code === 'Space') attackEnemy(1);
            if (e.code === 'KeyE') grabItem(1);
        }
    }

    if (canP2 && window.GameConfig.players > 1 && window.GameConfig.inputP2 === 'keyboard') {
        if (e.code === 'KeyP' || e.code === 'KeyO') window.toggleInventory(2);

        if (s2.isInvOpen) {
            if (e.code === 'ArrowUp') window.navigateInventory(2, 'up');
            if (e.code === 'ArrowDown') window.navigateInventory(2, 'down');
            if (e.code === 'ArrowLeft') window.navigateInventory(2, 'left');
            if (e.code === 'ArrowRight') window.navigateInventory(2, 'right');
            if (e.code === 'Numpad0' || e.code === 'Enter') window.executeInventory(2);
        } else if (!s2.isPaused) {
            if (e.code === 'ArrowUp') { keyState[2].up = true; if(!window.GameConfig.smooth) startMoving(2, 'up'); }
            if (e.code === 'ArrowDown') { keyState[2].down = true; if(!window.GameConfig.smooth) startMoving(2, 'down'); }
            if (e.code === 'ArrowLeft') { keyState[2].left = true; if(!window.GameConfig.smooth) startMoving(2, 'left'); }
            if (e.code === 'ArrowRight') { keyState[2].right = true; if(!window.GameConfig.smooth) startMoving(2, 'right'); }
            if (e.code === 'Enter' || e.code === 'Numpad0') attackEnemy(2);
            if (e.code === 'ShiftRight' || e.code === 'ControlRight') grabItem(2);
        }
    }
});

document.addEventListener('keyup', (e) => {
    activeKeys.delete(e.code);
    if (e.code === 'KeyW') { keyState[1].up = false; if(!window.GameConfig.smooth) stopMoving(1); }
    if (e.code === 'KeyS') { keyState[1].down = false; if(!window.GameConfig.smooth) stopMoving(1); }
    if (e.code === 'KeyA') { keyState[1].left = false; if(!window.GameConfig.smooth) stopMoving(1); }
    if (e.code === 'KeyD') { keyState[1].right = false; if(!window.GameConfig.smooth) stopMoving(1); }

    if (e.code === 'ArrowUp') { keyState[2].up = false; if(!window.GameConfig.smooth) stopMoving(2); }
    if (e.code === 'ArrowDown') { keyState[2].down = false; if(!window.GameConfig.smooth) stopMoving(2); }
    if (e.code === 'ArrowLeft') { keyState[2].left = false; if(!window.GameConfig.smooth) stopMoving(2); }
    if (e.code === 'ArrowRight') { keyState[2].right = false; if(!window.GameConfig.smooth) stopMoving(2); }
});