// mazeEngine.js - Generator Labirin Acak (DFS Solvable) & Visual Render

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

    let deadEnds = [];
    let allPaths = [];
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
    
    // 1. Gambar Seluruh Lantai Dasar (Hitam/Abu Gelap)
    ctx.fillStyle = '#222';
    ctx.fillRect(offsetX, offsetY, width * cellSize, height * cellSize);

    // 2. Gambar Zona Jangkauan Monster (Hanya untuk Diff > 3)
    let diff = window.GameConfig ? window.GameConfig.diff : 3;
    if (diff > 3 && pState && pState.monsters) {
        ctx.fillStyle = 'rgba(231, 76, 60, 0.15)'; // Merah transparan
        for (let key in pState.monsters) {
            let [mx, my] = key.split(',').map(Number);
            let mCenterX = offsetX + (mx * cellSize) + (cellSize / 2);
            let mCenterY = offsetY + (my * cellSize) + (cellSize / 2);
            
            ctx.beginPath();
            // Jangkauan aggro radius 4.5 sel agar pas menutupi 4 blok di sekitarnya
            ctx.arc(mCenterX, mCenterY, 4.5 * cellSize, 0, Math.PI * 2); 
            ctx.fill();
        }
    }

    // 3. Gambar Tembok dan Entitas
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let drawX = offsetX + (x * cellSize); let drawY = offsetY + (y * cellSize);
            let centerX = drawX + (cellSize / 2); let centerY = drawY + (cellSize / 2);
            
            if (maze[y][x] === 1) { // Tembok
                ctx.fillStyle = theme === 'jungle' ? '#228B22' : '#5D4037';
                ctx.fillRect(drawX, drawY, Math.ceil(cellSize), Math.ceil(cellSize));
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.strokeRect(drawX, drawY, Math.ceil(cellSize), Math.ceil(cellSize));
            } else if(maze[y][x] === 3) { // Pintu
                ctx.font = `${cellSize * 0.7}px Arial`;
                ctx.fillText(pState && pState.hasKey ? '🚪' : '🔒', centerX, centerY);
            } else if(maze[y][x] === 2) { // Kunci
                ctx.font = `${cellSize * 0.6}px Arial`; ctx.fillText('🔑', centerX, centerY);
            } else if(maze[y][x] >= 10 && maze[y][x] <= 23) { // Database Item
                if (window.ITEM_DB && window.ITEM_DB[maze[y][x]]) {
                    ctx.font = `${cellSize * 0.6}px Arial`; 
                    ctx.fillText(window.ITEM_DB[maze[y][x]].emoji, centerX, centerY);
                }
            } else if(maze[y][x] === 4) { // Monster
                if (pState && pState.monsters[`${x},${y}`]) {
                    let m = pState.monsters[`${x},${y}`];
                    ctx.font = `${cellSize * 0.7}px Arial`; ctx.fillText(m.emoji, centerX, centerY);
                    ctx.font = `bold ${cellSize * 0.25}px Arial`; ctx.fillStyle = '#ff4d4d';
                    ctx.fillText(`${m.hp}`, centerX, drawY + (cellSize * 0.15));
                }
            }
            
            if (pState && pState.x === x && pState.y === y && pState.hp > 0) { // Pemain
                ctx.font = `${cellSize * 0.75}px Arial`;
                let offset = (maze[y][x] >= 2 && maze[y][x] <= 23 && maze[y][x] !== 3) ? 5 : 0;
                ctx.fillText(pState.id === 1 ? '🧑‍🚀' : '🥷', centerX + offset, centerY - offset);
            }
        }
    }
}