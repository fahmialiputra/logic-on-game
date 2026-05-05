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
    maze[height-2][1] = 2; 
    maze[height-2][width-2] = 3; 
    return maze;
}

function renderMaze(ctx, maze, width, height, theme, pState) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const cellSize = Math.min(ctx.canvas.width / width, ctx.canvas.height / height);
    const offsetX = (ctx.canvas.width - (cellSize * width)) / 2;
    const offsetY = (ctx.canvas.height - (cellSize * height)) / 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let drawX = offsetX + (x * cellSize);
            let drawY = offsetY + (y * cellSize);
            let centerX = drawX + (cellSize / 2);
            let centerY = drawY + (cellSize / 2);
            
            if (maze[y][x] !== 1) {
                ctx.fillStyle = '#222';
                ctx.fillRect(drawX, drawY, Math.ceil(cellSize), Math.ceil(cellSize));
            }
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
            } else if(maze[y][x] === 5) {
                ctx.font = `${cellSize * 0.6}px Arial`; ctx.fillText('🗡️', centerX, centerY);
            } else if(maze[y][x] === 6) {
                ctx.font = `${cellSize * 0.6}px Arial`; ctx.fillText('🕯️', centerX, centerY);
            } else if(maze[y][x] === 7) { 
                ctx.font = `${cellSize * 0.6}px Arial`; ctx.fillText('🍎', centerX, centerY);
            } else if(maze[y][x] === 4) {
                if (pState && pState.monsters[`${x},${y}`]) {
                    let m = pState.monsters[`${x},${y}`];
                    ctx.font = `${cellSize * 0.7}px Arial`;
                    ctx.fillText(m.emoji, centerX, centerY);
                    ctx.font = `bold ${cellSize * 0.25}px Arial`;
                    ctx.fillStyle = '#ff4d4d';
                    ctx.fillText(`${m.hp}`, centerX, drawY + (cellSize * 0.15));
                }
            }
            
            if (pState && pState.x === x && pState.y === y && pState.hp > 0) {
                ctx.font = `${cellSize * 0.75}px Arial`;
                let offset = [2, 5, 6, 7].includes(maze[y][x]) ? 5 : 0;
                ctx.fillText(pState.id === 1 ? '🧑‍🚀' : '🥷', centerX + offset, centerY - offset);
            }
        }
    }
}// mazeEngine.js - Generator Labirin Acak (DFS Solvable) & Visual Render

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
    maze[height-2][1] = 2; 
    maze[height-2][width-2] = 3; 
    return maze;
}

function renderMaze(ctx, maze, width, height, theme, pState) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const cellSize = Math.min(ctx.canvas.width / width, ctx.canvas.height / height);
    const offsetX = (ctx.canvas.width - (cellSize * width)) / 2;
    const offsetY = (ctx.canvas.height - (cellSize * height)) / 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let drawX = offsetX + (x * cellSize);
            let drawY = offsetY + (y * cellSize);
            let centerX = drawX + (cellSize / 2);
            let centerY = drawY + (cellSize / 2);
            
            if (maze[y][x] !== 1) {
                ctx.fillStyle = '#222';
                ctx.fillRect(drawX, drawY, Math.ceil(cellSize), Math.ceil(cellSize));
            }
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
            } else if(maze[y][x] === 5) {
                ctx.font = `${cellSize * 0.6}px Arial`; ctx.fillText('🗡️', centerX, centerY);
            } else if(maze[y][x] === 6) {
                ctx.font = `${cellSize * 0.6}px Arial`; ctx.fillText('🕯️', centerX, centerY);
            } else if(maze[y][x] === 7) { 
                ctx.font = `${cellSize * 0.6}px Arial`; ctx.fillText('🍎', centerX, centerY);
            } else if(maze[y][x] === 4) {
                if (pState && pState.monsters[`${x},${y}`]) {
                    let m = pState.monsters[`${x},${y}`];
                    ctx.font = `${cellSize * 0.7}px Arial`;
                    ctx.fillText(m.emoji, centerX, centerY);
                    ctx.font = `bold ${cellSize * 0.25}px Arial`;
                    ctx.fillStyle = '#ff4d4d';
                    ctx.fillText(`${m.hp}`, centerX, drawY + (cellSize * 0.15));
                }
            }
            
            if (pState && pState.x === x && pState.y === y && pState.hp > 0) {
                ctx.font = `${cellSize * 0.75}px Arial`;
                let offset = [2, 5, 6, 7].includes(maze[y][x]) ? 5 : 0;
                ctx.fillText(pState.id === 1 ? '🧑‍🚀' : '🥷', centerX + offset, centerY - offset);
            }
        }
    }
}