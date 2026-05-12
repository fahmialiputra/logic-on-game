// mazeEngine.js - Render Visual Effects & Layering Mulus

function generateMaze(width, height) {
    let maze = Array.from({ length: height }, () => Array(width).fill(1));
    function carve(x, y) {
        maze[y][x] = 0;
        const dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]].sort(() => Math.random() - 0.5);
        for (let [dx, dy] of dirs) {
            let nx = x + dx, ny = y + dy;
            if (ny > 0 && ny < height - 1 && nx > 0 && nx < width - 1 && maze[ny][nx] === 1) {
                maze[y + dy / 2][x + dx / 2] = 0;
                carve(nx, ny);
            }
        }
    }
    carve(1, 1);

    let deadEnds = []; let allPaths = [];
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            if (maze[y][x] === 0 && !(x === 1 && y === 1)) {
                allPaths.push({x, y});
                let pathNeighbors = 0;
                if (maze[y-1][x] === 0) pathNeighbors++;
                if (maze[y+1][x] === 0) pathNeighbors++;
                if (maze[y][x-1] === 0) pathNeighbors++;
                if (maze[y][x+1] === 0) pathNeighbors++;
                if (pathNeighbors === 1) deadEnds.push({x, y});
            }
        }
    }
    deadEnds.sort(() => Math.random() - 0.5);
    allPaths.sort(() => Math.random() - 0.5);
    
    let keyPos = deadEnds.length > 0 ? deadEnds.pop() : allPaths.pop();
    let exitPos = deadEnds.length > 0 ? deadEnds.pop() : allPaths.pop();
    maze[keyPos.y][keyPos.x] = 2; // Kunci Emas
    maze[exitPos.y][exitPos.x] = 3; // Pintu Keluar
    
    return maze;
}

function renderMaze(ctx, maze, width, height, theme, pState) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const cellSize = Math.min(ctx.canvas.width / width, ctx.canvas.height / height);
    const offsetX = (ctx.canvas.width - (cellSize * width)) / 2;
    const offsetY = (ctx.canvas.height - (cellSize * height)) / 2;
    
    // 1. Gambar Lantai
    ctx.fillStyle = '#222';
    ctx.fillRect(offsetX, offsetY, width * cellSize, height * cellSize);

    let diff = window.GameConfig ? window.GameConfig.diff : 3;

    // 2. Gambar Zona Bahaya (Paling Bawah, Dibuat Sangat Transparan 0.03)
    if (pState && pState.monsters && !pState.isDead) {
        let radius = (diff > 3) ? 4.5 * cellSize : 1.5 * cellSize;
        ctx.fillStyle = 'rgba(231, 76, 60, 0.03)'; 
        
        for (let key in pState.monsters) {
            let m = pState.monsters[key];
            let vx = m.visualX !== undefined ? m.visualX : m.originX;
            let vy = m.visualY !== undefined ? m.visualY : m.originY;
            let mCenterX = offsetX + (vx * cellSize) + (cellSize / 2);
            let mCenterY = offsetY + (vy * cellSize) + (cellSize / 2);
            
            ctx.beginPath();
            ctx.arc(mCenterX, mCenterY, radius, 0, Math.PI * 2); 
            ctx.fill();
        }
    }

    ctx.textAlign = "center"; ctx.textBaseline = "middle";

    // 3. Gambar Tembok & Item
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let drawX = offsetX + (x * cellSize); 
            let drawY = offsetY + (y * cellSize);
            let centerX = drawX + (cellSize / 2); 
            let centerY = drawY + (cellSize / 2);
            
            if (maze[y][x] === 1) {
                ctx.fillStyle = theme === 'jungle' ? '#228B22' : '#5D4037';
                ctx.fillRect(drawX, drawY, Math.ceil(cellSize), Math.ceil(cellSize));
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.strokeRect(drawX, drawY, Math.ceil(cellSize), Math.ceil(cellSize));
            } else if(maze[y][x] === 3) {
                ctx.font = `${cellSize * 0.7}px Arial`;
                ctx.fillText(pState && pState.hasKey ? '🚪' : '🔒', centerX, centerY);
            } else if(maze[y][x] === 2) {
                ctx.font = `${cellSize * 0.6}px Arial`; ctx.fillText('🔑', centerX, centerY);
            } else if(maze[y][x] >= 10 && maze[y][x] <= 23) {
                if (window.ITEM_DB && window.ITEM_DB[maze[y][x]]) {
                    ctx.font = `${cellSize * 0.6}px Arial`; 
                    ctx.fillText(window.ITEM_DB[maze[y][x]].emoji, centerX, centerY);
                }
            }
        }
    }

    // 4. Gambar Monster
    if (pState && pState.monsters) {
        for (let key in pState.monsters) {
            let m = pState.monsters[key];
            let vx = m.visualX !== undefined ? m.visualX : m.originX;
            let vy = m.visualY !== undefined ? m.visualY : m.originY;
            let mCenterX = offsetX + (vx * cellSize) + (cellSize / 2);
            let mCenterY = offsetY + (vy * cellSize) + (cellSize / 2);
            
            ctx.font = `${cellSize * 0.7}px Arial`; 
            ctx.fillText(m.emoji, mCenterX, mCenterY);
            ctx.font = `bold ${cellSize * 0.25}px Arial`; 
            ctx.fillStyle = '#ff4d4d';
            ctx.fillText(`${m.hp}`, mCenterX, mCenterY - (cellSize * 0.35)); 
        }
    }

    // 5. Gambar Pemain
    if (pState && pState.visualX !== undefined) {
        let px = offsetX + (pState.visualX * cellSize) + (cellSize / 2);
        let py = offsetY + (pState.visualY * cellSize) + (cellSize / 2);
        
        ctx.font = `${cellSize * 0.75}px Arial`;
        if (pState.isDead) {
            ctx.fillText('🪦', px, py);
        } else if (pState.hp > 0) {
            ctx.fillText(pState.id === 1 ? '🧑‍🚀' : '🥷', px, py);
        }
    }

    // 6. Gambar Efek Visual Pertarungan
    if (pState && pState.effects) {
        pState.effects.forEach(eff => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, eff.life); 
            
            let effX = offsetX + (eff.x * cellSize) + (cellSize / 2);
            let effY = offsetY + (eff.y * cellSize) + (cellSize / 2);
            
            if (eff.type === 'enemy_attack') {
                ctx.font = `${cellSize * 1.5}px Arial`;
                ctx.translate(effX, effY);
                ctx.rotate(0.2);
                ctx.fillText(eff.emoji, 0, 0);
            } else if (eff.type === 'player_attack') {
                ctx.font = `${cellSize * 1.2}px Arial`;
                ctx.translate(effX, effY - ((1 - eff.life) * (cellSize * 0.5))); 
                ctx.fillText(eff.emoji, 0, 0);
            } else {
                ctx.font = `${cellSize * 0.8}px Arial`;
                ctx.translate(effX, effY - ((1 - eff.life) * (cellSize * 0.8)));
                ctx.fillText(eff.emoji, 0, 0);
            }
            ctx.restore();
        });
    }
}