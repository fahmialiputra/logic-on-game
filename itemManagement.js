function grabItem(playerObj) {
    let state = playerObj == 1 ? window.p1State : window.p2State;
    if (state.isPaused || state.isDead || state.isPromptingResurrect) return;
    let gridX = Math.round(state.x); let gridY = Math.round(state.y);
    let cell = state.maze[gridY][gridX];
    let diff = window.GameConfig.diff || 3;
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
        showToast(playerObj, "INFO", "Akan terpakai otomatis jika mati.");
        return;
    }
    if (state.isPaused && state.hp === 1 && item.type !== 'heal' && item.type !== 'shield') {
        showToast(playerObj, "KRITIS!", "Harus pakai pemulih/pelindung!");
        return;
    }
    
    state.inventory.splice(itemIndex, 1);
    document.getElementById(`inv-p${playerObj}`).classList.add('hidden'); 
    
    if (item.type === 'heal') {
        let cap = typeof getMaxHpCap === "function" ? getMaxHpCap(state) : 100;
        state.hp = Math.min(cap, state.hp + item.val);
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