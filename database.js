// database.js - Data Item, Karakter Musuh, dan Status Awal Pemain

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

window.ENEMY_DB = {
    'dark': { emoji: '🦇', name: 'Vampire', baseHp: 25, baseAtk: 10, baseDef: 0, diffHpBonus: 5, diffAtkBonus: 3, diffDefBonus: 1 },
    'beast': { emoji: '🐺', name: 'Werewolf', baseHp: 20, baseAtk: 8, baseDef: 1, diffHpBonus: 5, diffAtkBonus: 2, diffDefBonus: 1 },
    'boss': { emoji: '👹', name: 'Demon Lord', baseHp: 100, baseAtk: 25, baseDef: 0, diffHpBonus: 30, diffAtkBonus: 8, diffDefBonus: 3 }
};

window.PLAYER_BASE_STATE = {
    hp: 100, maxHp: 100, shield: 0, maxShield: 100,
    atk: 15, def: 5, baseAtk: 15, baseDef: 5
};