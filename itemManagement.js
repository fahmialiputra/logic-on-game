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
    23: { name: 'Obat', emoji: '💊', type: 'heal', val: 100 },
    24: { name: 'Ramuan Pelindung', emoji: '🧪', type: 'shield', val: 25 },
    25: { name: 'Kristal Aegis', emoji: '💎', type: 'shield', val: 50 },
    
    // ITEM TINGKAT TINGGI (DIFF > 4)
    30: { name: 'Perisai Penangkis', emoji: '🔰', type: 'def_epic', dur: 15, isParry: true, parryChance: 0.5 },
    31: { name: 'Ramuan Dewa', emoji: '🌟', type: 'def_epic', dur: 10, isInvincibility: true },
    32: { name: 'Armor Duri', emoji: '🌵', type: 'def_epic', dur: 15, isReflect: true, reflectChance: 0.5 },
    33: { name: 'Sepatu Angin', emoji: '👟', type: 'util_epic', dur: 15, speedMod: 1.5 },
    34: { name: 'Sayap Hermes', emoji: '🪽', type: 'util_epic', dur: 10, speedMod: 2.0 },
    35: { name: 'Tombak Penembus', emoji: '🔱', type: 'util_epic', dur: 15, pierce: true, rangeBonus: 1.5, pierceChance: 0.5 },
    36: { name: 'Jangkar Teleport', emoji: '⚓', type: 'teleport' },
    37: { name: 'Eliksir Kehidupan', emoji: '🍷', type: 'heal', val: 200 },
    38: { name: 'Bunga Regen', emoji: '🌸', type: 'regen', dur: 5, regenRate: 20 },
    39: { name: 'Ankh Pembangkit', emoji: '☥', type: 'revive' }
};

function grabItem(playerObj) {
    let state = playerObj == 1 ? window.p1State : window.p2State;
    if (state.isPaused || state.isDead || state.isPromptingResurrect) return;

    let gridX = Math.round(state.x); let gridY = Math.round(state.y);
    let cell = state.maze[gridY][gridX];
    
    let diff = window.GameConfig.diff || 3;
    
    // SKALA BARU KAPASITAS TAS: 
    // KESULITAN 1 = 24 slot | 2 = 20 slot | 3 = 16 slot | 4 = 12 slot | 5 = 8 slot
    let maxInv = (28 - (diff * 4)) + (state.maxInvBonus || 0); 
    
    let currentItemsCount = state.inventory.filter(i => i !== 'key').length;
    
    if (cell === 2 || window.ITEM_DB[cell]) { 
        if(cell !== 2 && currentItemsCount >= maxInv) { 
            showToast(playerObj, "TAS PENUH", `Maks. ${maxInv} barang!`); return; 
        }
        
        let itemName = "";
        if (cell === 2) { state.inventory.push('key'); state.hasKey = true; itemName = "Kunci Emas 🔑"; }
        else { state.inventory.push(cell); itemName = `${window.ITEM_DB[cell].emoji} ${window.ITEM_DB[cell].name}`; }
        
        state.maze[gridY][gridX] = 0; state.score += 15;
        triggerEffect(playerObj, 'buff');
        showToast(playerObj, "AMBIL", `${itemName}`);
        updateStatsUI(playerObj); 
    } else showToast(playerObj, "KOSONG", "Tidak ada item.");
}

function useItem(playerObj, itemIndex) {
    let state = playerObj == 1 ? window.p1State : window.p2State;
    let itemId = state.inventory[itemIndex];
    if (!itemId) return;
    
    if (itemId === 'key') { showToast(playerObj, "INFO", "Tabrak pintu untuk pakai."); return; }
    let item = window.ITEM_DB[itemId];

    if (item.type === 'teleport') {
        if (!state.teleportAnchor) {
            state.teleportAnchor = { x: state.x, y: state.y };
            showToast(playerObj, "TELEPORT", "Lokasi Disimpan!");
            document.getElementById(`inv-p${playerObj}`).classList.add('hidden');
            return;
        } else {
            state.x = state.teleportAnchor.x; state.y = state.teleportAnchor.y;
            state.teleportAnchor = null;
            showToast(playerObj, "TELEPORT", "Berpindah!");
            triggerEffect(playerObj, 'buff');
        }
    }

    if (item.type === 'revive') {
        showToast(playerObj, "INFO", "Akan terpakai otomatis jika kau mati.");
        return;
    }

    if (state.isPaused && state.hp === 1 && item.type !== 'heal' && item.type !== 'shield') {
        showToast(playerObj, "KRITIS!", "Harus pakai pemulih/pelindung!");
        return;
    }

    state.inventory.splice(itemIndex, 1);
    document.getElementById(`inv-p${playerObj}`).classList.add('hidden'); 
    
    if (item.type === 'heal') {
        state.hp = Math.min(getMaxHpCap(), state.hp + item.val);
        if (state.isPaused) state.isPaused = false; 
        triggerEffect(playerObj, 'heal'); showToast(playerObj, "HEAL", `+${item.val} HP.`);
    } 
    else if (item.type === 'shield') {
        state.shield = Math.min(100, state.shield + item.val);
        if (state.isPaused) state.isPaused = false; 
        triggerEffect(playerObj, 'buff'); showToast(playerObj, "SHIELD", `+${item.val} Pelindung.`);
    } 
    else {
        let buffObj = { 
            id: itemId, emoji: item.emoji, name: item.name,
            maxTime: item.dur, timeLeft: item.dur,
            atkBonus: item.type === 'atk' ? item.val : 0,
            defBonus: item.type === 'def' ? item.val : (item.defBonus || 0),
            lightBonus: (item.type === 'util' && item.utilType === 'light') ? 1 : 0,
            
            isParry: item.isParry, parryChance: item.parryChance,
            isReflect: item.isReflect, reflectChance: item.reflectChance,
            isInvincibility: item.isInvincibility, speedMod: item.speedMod,
            pierce: item.pierce, rangeBonus: item.rangeBonus, regenRate: item.regenRate
        }; 
        state.activeBuffs.push(buffObj);
        triggerEffect(playerObj, 'buff'); 
        
        state.atk += buffObj.atkBonus; state.def += buffObj.defBonus; state.lightBuff += buffObj.lightBonus;
        showToast(playerObj, "BUFF", `${item.name} aktif!`);
    }
    updateStatsUI(playerObj); 
}