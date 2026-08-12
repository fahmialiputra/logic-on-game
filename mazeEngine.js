function generateMaze(width, height, isBossStage = false) {
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
    
    if (isBossStage) {
        for(let y=2; y<height-2; y++) {
            for(let x=2; x<width-2; x++) {
                if(maze[y][x] === 1 && Math.random() < 0.4) maze[y][x] = 0;
            }
        }
    }
    
    let deadEnds = []; let otherPaths = [];
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            if (maze[y][x] === 0 && !(x === 1 && y === 1)) {
                let pathNeighbors = 0;
                if (maze[y-1][x] === 0) pathNeighbors++;
                if (maze[y+1][x] === 0) pathNeighbors++;
                if (maze[y][x-1] === 0) pathNeighbors++;
                if (maze[y][x+1] === 0) pathNeighbors++;
                
                if (pathNeighbors === 1) deadEnds.push({x, y});
                else otherPaths.push({x, y});
            }
        }
    }
    
    deadEnds.sort(() => Math.random() - 0.5);
    otherPaths.sort(() => Math.random() - 0.5);
    
    let exitPos = deadEnds.length > 0 ? deadEnds.pop() : otherPaths.pop();
    if (!exitPos) { exitPos = {x: width - 2, y: height - 2}; maze[exitPos.y][exitPos.x] = 0; }
    maze[exitPos.y][exitPos.x] = 3; 
    
    if (!isBossStage) {
        let keyPos = deadEnds.length > 0 ? deadEnds.pop() : otherPaths.pop();
        if (!keyPos) { keyPos = {x: 1, y: 2}; maze[keyPos.y][keyPos.x] = 0; }
        maze[keyPos.y][keyPos.x] = 2; 
    }
    
    return maze;
}

function renderMaze(ctx, maze, width, height, theme, pState) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const cellSize = Math.min(ctx.canvas.width / width, ctx.canvas.height / height);
    const offsetX = (ctx.canvas.width - (cellSize * width)) / 2;
    const offsetY = (ctx.canvas.height - (cellSize * height)) / 2;
    
    ctx.fillStyle = '#222';
    ctx.fillRect(offsetX, offsetY, width * cellSize, height * cellSize);
    
    let diff = window.GameConfig ? window.GameConfig.diff : 3;
    
    if (pState && pState.monsters && !pState.isDead) {
        let radius = (diff > 3) ? 4.5 * cellSize : 1.5 * cellSize;
        ctx.fillStyle = 'rgba(231, 76, 60, 0.03)';
        pState.monsters.forEach(m => {
            let mCenterX = offsetX + (m.visualX * cellSize) + (cellSize / 2);
            let mCenterY = offsetY + (m.visualY * cellSize) + (cellSize / 2);
            ctx.beginPath(); ctx.arc(mCenterX, mCenterY, radius, 0, Math.PI * 2); ctx.fill();
        });
    }
    
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    let assets = window.GameAssets.images;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let drawX = offsetX + (x * cellSize); let drawY = offsetY + (y * cellSize);
            let centerX = drawX + (cellSize / 2); let centerY = drawY + (cellSize / 2);
            let cell = maze[y][x];
            
            if (cell === 1) {
                ctx.fillStyle = theme === 'jungle' ? '#228B22' : '#5D4037';
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(drawX, drawY, Math.ceil(cellSize), Math.ceil(cellSize), cellSize * 0.25);
                } else {
                    ctx.rect(drawX, drawY, Math.ceil(cellSize), Math.ceil(cellSize));
                }
                ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            } else if(cell === 3) {
                let imgDoor = pState && pState.hasKey ? assets['door_open'] : assets['door_closed'];
                if(imgDoor) ctx.drawImage(imgDoor, drawX, drawY, cellSize, cellSize);
                else { 
                    ctx.font = `${cellSize * 0.7}px Arial`; 
                    ctx.fillText(pState && pState.hasKey ? '🚪' : '🔒', centerX, centerY); 
                }
            } else if(cell === 2) {
                if(assets['key']) ctx.drawImage(assets['key'], drawX + cellSize*0.1, drawY + cellSize*0.1, cellSize*0.8, cellSize*0.8);
                else { 
                    ctx.font = `${cellSize * 0.6}px Arial`; 
                    ctx.fillText('🔑', centerX, centerY); 
                }
            } else if(cell >= 10 && cell <= 39) { 
                let imgItem = assets[`item_${cell}`];
                if(imgItem) ctx.drawImage(imgItem, drawX + cellSize*0.1, drawY + cellSize*0.1, cellSize*0.8, cellSize*0.8);
                else if (window.ITEM_DB[cell]) {
                    ctx.font = `${cellSize * 0.6}px Arial`; 
                    ctx.fillText(window.ITEM_DB[cell].emoji, centerX, centerY);
                }
            }
        }
    }
    
    if (pState && pState.monsters) {
        pState.monsters.forEach(m => {
            let mCenterX = offsetX + (m.visualX * cellSize) + (cellSize / 2);
            let mCenterY = offsetY + (m.visualY * cellSize) + (cellSize / 2);
            let mImg = assets[`enemy_${m.type}`];
            let drawSize = (m.type === 'boss') ? cellSize * 1.5 : cellSize * 0.8;
            
            if(mImg) ctx.drawImage(mImg, mCenterX - drawSize/2, mCenterY - drawSize/2, drawSize, drawSize);
            else { 
                ctx.font = `${(m.type === 'boss') ? cellSize : cellSize * 0.7}px Arial`; 
                ctx.fillText(m.emoji, mCenterX, mCenterY); 
            }
            
            let hpView = window.GameConfig.enemyHpView || 'angka';
            if (hpView === 'angka' && m.type !== 'boss') {
                ctx.font = `bold ${cellSize * 0.25}px Arial`; ctx.fillStyle = '#ff4d4d';
                ctx.fillText(`${Math.round(m.hp)}`, mCenterX, mCenterY - (cellSize * 0.45)); 
            }
            else if (hpView === 'bar' || m.type === 'boss') {
                let isBoss = m.type === 'boss';
                let barW = isBoss ? cellSize * 1.4 : cellSize * 0.6; 
                let barH = isBoss ? cellSize * 0.15 : cellSize * 0.08;
                let barX = mCenterX - barW / 2; 
                let barY = mCenterY - (drawSize / 2) - (cellSize * 0.2);
                let pct = Math.max(0, Math.min(1, m.hp / (m.maxHp || m.hp)));
                
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; 
                ctx.fillRect(barX, barY, barW, barH);
                
                if (isBoss) {
                    let grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
                    grad.addColorStop(0, '#8b0000'); grad.addColorStop(1, '#e74c3c');
                    ctx.fillStyle = grad;
                } else {
                    ctx.fillStyle = pct > 0.35 ? '#2ecc71' : '#e74c3c'; 
                }
                ctx.fillRect(barX, barY, barW * pct, barH);
                
                ctx.strokeStyle = isBoss ? '#f1c40f' : '#000'; 
                ctx.lineWidth = isBoss ? 2 : 1; 
                ctx.strokeRect(barX, barY, barW, barH);
            }
        });
    }
    
    if (pState && pState.visualX !== undefined) {
        let px = offsetX + (pState.visualX * cellSize) + (cellSize / 2);
        let py = offsetY + (pState.visualY * cellSize) + (cellSize / 2);
        
        if (pState.shield > 0 && !pState.isDead) {
            ctx.beginPath(); ctx.arc(px, py, cellSize * 0.45, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
        }
        
        let pImg = pState.isDead ? assets['dead'] : (pState.id === 1 ? assets['player1'] : assets['player2']);
        if(pImg) ctx.drawImage(pImg, px - cellSize*0.4, py - cellSize*0.4, cellSize*0.8, cellSize*0.8);
        else {
            ctx.font = `${cellSize * 0.75}px Arial`;
            ctx.fillText(pState.isDead ? '👻' : (pState.id === 1 ? '🧑' : '👱'), px, py);
        }
    }
    
    if (pState && pState.effects) {
        pState.effects.forEach(eff => {
            ctx.save(); ctx.globalAlpha = Math.max(0, eff.life); 
            let effX = offsetX + (eff.x * cellSize) + (cellSize / 2);
            let effY = offsetY + (eff.y * cellSize) + (cellSize / 2);
            
            if (eff.type === 'shield_trail') {
                ctx.beginPath(); ctx.arc(effX, effY, cellSize * 0.1 * eff.life, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 255, 255, ${eff.life * 0.8})`;
                ctx.shadowBlur = 5; ctx.shadowColor = '#00ffff'; ctx.fill();
            } 
            else if (eff.type === 'enemy_attack') {
                ctx.font = `${cellSize * 1.5}px Arial`; ctx.translate(effX, effY); ctx.rotate(0.2); ctx.fillText(eff.emoji, 0, 0);
            }
            else if (eff.type === 'player_attack_swing') {
                ctx.font = `${cellSize * 1.5}px Arial`;
                let rot = (1 - eff.life) * (Math.PI); 
                let angle = Math.atan2(eff.dy || 0, eff.dx || 1); 
                ctx.translate(effX, effY);
                ctx.rotate(angle - (Math.PI/2) + rot); 
                ctx.fillText(eff.emoji, 0, 0);
            }
            else {
                ctx.font = `${cellSize * 0.8}px Arial`; ctx.translate(effX, effY - ((1 - eff.life) * (cellSize * 0.8))); ctx.fillText(eff.emoji, 0, 0);
            }
            ctx.restore();
        });
    }
}