const canvas = document.getElementById("MyCanvas");
        const ctx = canvas.getContext("2d");

        // Colors and shape definitions
        const pink = "#ffd1dc";
        const green = "#8da58d";
        const yellow = "#fffacd";
        const blue = "#cfe2f3";
        const purple = "#d9d2e9";
        const colour_list = [pink, green, yellow, blue, purple];
        const shape_list = [
            [[1, 0], [1, 1]],
            [[1, 1], [1, 1]],
            [[1, 0], [1, 0], [1, 1]],
            [[0, 1], [1, 1], [1, 0]],
            [[1, 0], [1, 1], [0, 1]],
            [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
            [[1, 1, 1, 1]],
            [[1], [1], [1], [1]],
            [[1]],
            [[1, 1]],
            [[1], [1]]
        ];
        const size = 50;
        const smallSize = 40;
        let score = 0;
        let highscore = 0;
        let comboLevel = 0;
        let movesSinceLastClear = 0;
        let isAnimating = false;
        let blocks = [];
        let placedBlocks = [];

        // Save game state to chrome.storage.local or localStorage
        function saveGameState() {
            const gameState = {
                score,
                highscore,
                comboLevel,
                movesSinceLastClear,
                blocks,
                placedBlocks
            };
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ gameState }, () => {
                    console.log("Game state saved to chrome.storage.local:", gameState);
                });
            } else {
                localStorage.setItem('gameState', JSON.stringify(gameState));
                console.log("Game state saved to localStorage:", gameState);
            }
        }

        // Load game state from chrome.storage.local or localStorage
        async function loadGameState() {
            return new Promise((resolve) => {
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.get(['gameState'], (result) => {
                        if (result.gameState) {
                            score = result.gameState.score || 0;
                            highscore = result.gameState.highscore || 0;
                            comboLevel = result.gameState.comboLevel || 0;
                            movesSinceLastClear = result.gameState.movesSinceLastClear || 0;
                            blocks = result.gameState.blocks || [randomBlock(0), randomBlock(1), randomBlock(2)];
                            placedBlocks = result.gameState.placedBlocks || [];
                            console.log("Game state loaded from chrome.storage.local:", result.gameState);
                        } else {
                            score = 0;
                            highscore = 0;
                            comboLevel = 0;
                            movesSinceLastClear = 0;
                            blocks = [randomBlock(0), randomBlock(1), randomBlock(2)];
                            placedBlocks = [];
                            console.log("No saved game state found, initialized default state");
                        }
                        resolve();
                    });
                } else {
                    const savedState = JSON.parse(localStorage.getItem('gameState'));
                    if (savedState) {
                        score = savedState.score || 0;
                        highscore = savedState.highscore || 0;
                        comboLevel = savedState.comboLevel || 0;
                        movesSinceLastClear = savedState.movesSinceLastClear || 0;
                        blocks = savedState.blocks || [randomBlock(0), randomBlock(1), randomBlock(2)];
                        placedBlocks = savedState.placedBlocks || [];
                        console.log("Game state loaded from localStorage:", savedState);
                    } else {
                        score = 0;
                        highscore = 0;
                        comboLevel = 0;
                        movesSinceLastClear = 0;
                        blocks = [randomBlock(0), randomBlock(1), randomBlock(2)];
                        placedBlocks = [];
                        console.log("No saved game state found, initialized default state");
                    }
                    resolve();
                }
            });
        }

        // Save game state when the extension is closed
        window.addEventListener('unload', saveGameState);

        // Draw the grid
        function drawGrid() {
            ctx.strokeStyle = "#aaa";
            ctx.lineWidth = 1;
            for (let i = 1; i <= 8; i++) {
                ctx.beginPath();
                ctx.moveTo(0, size * i);
                ctx.lineTo(400, size * i);
                ctx.stroke();
            }
            for (let i = 1; i <= 8; i++) {
                ctx.beginPath();
                ctx.moveTo(size * i, 0);
                ctx.lineTo(size * i, 400);
                ctx.stroke();
            }
            ctx.save();
            ctx.globalAlpha = 0.04;
            ctx.fillStyle = "#5656ff";
            ctx.fillRect(0, 0, 400, 400);
            ctx.restore();
        }

        function drawScore() {
            ctx.save();
            let fontSize = 20 * (canvas.width / 550);
            ctx.font = `${fontSize}px Handjet, Arial, sans-serif`;
            ctx.fillStyle = "#323680";
            ctx.textBaseline = "top";
            ctx.fillText("Score: " + score, 410 * (canvas.width / 550), 24 * (canvas.height / 700));
            ctx.restore();
        }

        function drawHighscore() {
            ctx.save();
            let fontSize = 20 * (canvas.width / 550);
            ctx.font = `${fontSize}px Handjet, Arial, sans-serif`;
            ctx.fillStyle = "#323680";
            ctx.textBaseline = "top";
            ctx.fillText("Highscore: " + highscore, 410 * (canvas.width / 550), 54 * (canvas.height / 700));
            ctx.restore();
        }

        const startingPositions = [
            { x: 25, y: 410 },
            { x: 175, y: 410 },
            { x: 350, y: 410 }
        ];

        function randomBlock(idx) {
            return {
                x: startingPositions[idx].x,
                y: startingPositions[idx].y,
                originalX: startingPositions[idx].x,
                originalY: startingPositions[idx].y,
                colour: colour_list[Math.floor(Math.random() * colour_list.length)],
                shape: JSON.parse(JSON.stringify(shape_list[Math.floor(Math.random() * shape_list.length)])),
                isPlaced: false,
                isDragging: false,
            };
        }

        function regenerateBlocks() {
            for (let i = 0; i < 3; i++) {
                blocks[i] = randomBlock(i);
                blocks[i].x = startingPositions[i].x;
                blocks[i].y = startingPositions[i].y;
            }
            console.log("Regenerated blocks:", blocks);
            saveGameState();
        }

        function drawBlock(block, placed = false, alpha = 1) {
            const blockSize = placed ? size : smallSize;
            ctx.fillStyle = block.colour;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = "#888";
            ctx.lineWidth = 2;
            for (let row = 0; row < block.shape.length; row++) {
                for (let col = 0; col < block.shape[row].length; col++) {
                    if (block.shape[row][col] === 1) {
                        ctx.save();
                        ctx.shadowColor = "#bfc2ec";
                        ctx.shadowBlur = (block.isDragging && !placed) ? 18 : 5;
                        ctx.fillRect(
                            block.x + col * blockSize,
                            block.y + row * blockSize,
                            blockSize,
                            blockSize
                        );
                        ctx.shadowBlur = 0;
                        ctx.strokeRect(
                            block.x + col * blockSize,
                            block.y + row * blockSize,
                            blockSize,
                            blockSize
                        );
                        ctx.restore();
                    }
                }
            }
            ctx.globalAlpha = 1;
        }

        function drawBlocks() {
            placedBlocks.forEach((block) => drawBlock(block, true));
            blocks.forEach((block) => drawBlock(block));
        }

        function getBlockCells(block, useSize = size) {
            let cells = [];
            for (let row = 0; row < block.shape.length; row++) {
                for (let col = 0; col < block.shape[row].length; col++) {
                    if (block.shape[row][col] === 1) {
                        let gridX = Math.floor((block.x + col * useSize) / size);
                        let gridY = Math.floor((block.y + row * useSize) / size);
                        cells.push({ x: gridX, y: gridY });
                    }
                }
            }
            return cells;
        }

        function isOverlapping(testBlock) {
            const testCells = getBlockCells(testBlock, size);
            for (let block of placedBlocks) {
                const blockCells = getBlockCells(block, size);
                for (let cell of testCells) {
                    if (blockCells.some(bc => bc.x === cell.x && bc.y === cell.y)) return true;
                }
            }
            return false;
        }

        function isWithinBounds(block) {
            const gridX = block.x / size;
            const gridY = block.y / size;
            for (let r = 0; r < block.shape.length; r++) {
                for (let c = 0; c < block.shape[r].length; c++) {
                    if (block.shape[r][c] === 1) {
                        let x = gridX + c;
                        let y = gridY + r;
                        if (x < 0 || x >= 8 || y < 0 || y >= 8) return false;
                    }
                }
            }
            return true;
        }

        function buildCellMap() {
            let cellMap = {};
            placedBlocks.forEach((block, bIdx) => {
                for (let row = 0; row < block.shape.length; row++) {
                    for (let col = 0; col < block.shape[row].length; col++) {
                        if (block.shape[row][col] === 1) {
                            let gridX = Math.round((block.x + col * size) / size);
                            let gridY = Math.round((block.y + row * size) / size);
                            let key = `${gridX},${gridY}`;
                            cellMap[key] = {
                                blockIndex: bIdx,
                                row: row,
                                col: col
                            };
                        }
                    }
                }
            });
            return cellMap;
        }

        async function clearFilledRowsAndColumns() {
            isAnimating = true;
            let cellMap = buildCellMap();
            let rowCounts = Array(8).fill(0);
            let colCounts = Array(8).fill(0);

            for (let key in cellMap) {
                let [x, y] = key.split(',').map(Number);
                if (x >= 0 && x < 8 && y >= 0 && y < 8) {
                    colCounts[x]++;
                    rowCounts[y]++;
                }
            }

            let filledRows = [];
            let filledCols = [];
            for (let i = 0; i < 8; i++) {
                if (rowCounts[i] === 8) filledRows.push(i);
                if (colCounts[i] === 8) filledCols.push(i);
            }

            let linesCleared = filledRows.length + filledCols.length;
            if (linesCleared === 0) {
                isAnimating = false;
                return;
            }

            for (let i = 0; i < 3; i++) {
                ctx.save();
                ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
                filledRows.forEach(row => {
                    ctx.fillRect(0, row * size, 400, size);
                });
                filledCols.forEach(col => {
                    ctx.fillRect(col * size, 0, size, 400);
                });
                ctx.restore();
                await new Promise(resolve => setTimeout(resolve, 100));
                redrawAll();
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            let cellsToClear = [];
            placedBlocks.forEach((block, bIdx) => {
                for (let row = 0; row < block.shape.length; row++) {
                    for (let col = 0; col < block.shape[row].length; col++) {
                        if (block.shape[row][col] === 1) {
                            let gridX = Math.round((block.x + col * size) / size);
                            let gridY = Math.round((block.y + row * size) / size);
                            if (filledRows.includes(gridY) || filledCols.includes(gridX)) {
                                cellsToClear.push({ block, row, col });
                            }
                        }
                    }
                }
            });

            for (let alpha = 1; alpha >= 0; alpha -= 0.1) {
                redrawAll();
                cellsToClear.forEach(({ block, row, col }) => {
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = block.colour;
                    ctx.fillRect(block.x + col * size, block.y + row * size, size, size);
                    ctx.strokeStyle = "#888";
                    ctx.strokeRect(block.x + col * size, block.y + row * size, size, size);
                    ctx.restore();
                });
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            placedBlocks.forEach((block) => {
                for (let row = 0; row < block.shape.length; row++) {
                    for (let col = 0; col < block.shape[row].length; col++) {
                        if (block.shape[row][col] === 1) {
                            let gridX = Math.round((block.x + col * size) / size);
                            let gridY = Math.round((block.y + row * size) / size);
                            if (filledRows.includes(gridY) || filledCols.includes(gridX)) {
                                block.shape[row][col] = 0;
                            }
                        }
                    }
                }
            });

            placedBlocks = placedBlocks.filter(block =>
                block.shape.some(row => row.some(cell => cell === 1))
            );

            if (movesSinceLastClear > 3 || comboLevel === 0) {
                comboLevel = 1;
            } else {
                comboLevel++;
                ctx.save();
                ctx.font = `bold ${30 * (canvas.width / 550)}px Handjet, Arial, sans-serif`;
                ctx.fillStyle = "#a32f2f";
                ctx.textAlign = "center";
                ctx.fillText("Combo: " + comboLevel, 410 * (canvas.width / 550), 160 * (canvas.height / 700));
                ctx.fillText("+" + 10 * linesCleared * comboLevel, 410 * (canvas.width / 550), 200 * (canvas.height / 700));
                ctx.restore();
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            score += 10 * linesCleared * comboLevel;
            movesSinceLastClear = 0;

            isAnimating = false;
            redrawAll();
            saveGameState();
        }

        function checkGameOver() {
            for (let block of blocks) {
                for (let gridY = 0; gridY < 8; gridY++) {
                    for (let gridX = 0; gridX < 8; gridX++) {
                        block.x = gridX * size;
                        block.y = gridY * size;
                        if (isWithinBounds(block) && !isOverlapping(block)) {
                            block.x = block.originalX;
                            block.y = block.originalY;
                            return false;
                        }
                    }
                }
                block.x = block.originalX;
                block.y = block.originalY;
            }
            return true;
        }

        function redrawAll() {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawGrid();
            drawBlocks();
            drawScore();
            drawHighscore();
        }

        let isDragging = false;
        let currentBlock = null;
        let lastTouchTime = 0;
        let isGameOver = false;

        canvas.addEventListener("mousedown", function (e) {
            if (isDragging || isGameOver || isAnimating) return;

            let rect = canvas.getBoundingClientRect();
            let x = (e.clientX - rect.left) * (canvas.width / rect.width);
            let y = (e.clientY - rect.top) * (canvas.height / rect.height);

            blocks.forEach((block) => {
                if (
                    !block.isPlaced &&
                    x >= block.x &&
                    x <= block.x + block.shape[0].length * smallSize &&
                    y >= block.y &&
                    y <= block.y + block.shape.length * smallSize
                ) {
                    isDragging = true;
                    block.isDragging = true;
                    currentBlock = block;
                    console.log("Selected block:", block);
                }
            });
        });

        function getBottomFilledRow(shape) {
            let maxRow = 0;
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c] === 1 && r > maxRow) maxRow = r;
                }
            }
            return maxRow;
        }

        function getRightFilledCol(shape) {
            let maxCol = 0;
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c] === 1 && c > maxCol) maxCol = c;
                }
            }
            return maxCol;
        }

        function countOnes(shape) {
            let count = 0;
            for (let row of shape) {
                for (let cell of row) {
                    if (cell === 1) {
                        count++;
                    }
                }
            }
            return count;
        }

        canvas.addEventListener("mousemove", function (e) {
            if (!isDragging || !currentBlock || currentBlock.isPlaced) return;

            let rect = canvas.getBoundingClientRect();
            let x = (e.clientX - rect.left) * (canvas.width / rect.width);
            let y = (e.clientY - rect.top) * (canvas.height / rect.height);

            let rightFilled = getRightFilledCol(currentBlock.shape);
            let bottomFilled = getBottomFilledRow(currentBlock.shape);

            let gridX = Math.floor(x / size);
            let gridY = Math.floor(y / size);

            gridX = Math.max(0, Math.min(gridX, 8 - (rightFilled + 1)));
            gridY = Math.max(0, Math.min(gridY, 8 - (bottomFilled + 1)));

            currentBlock.x = gridX * size;
            currentBlock.y = gridY * size;

            redrawAll();
        });

        canvas.addEventListener("mouseup", async function (e) {
            if (Date.now() - lastTouchTime < 100) return;
            if (!isDragging || !currentBlock) return;
            isDragging = false;

            let canPlace = isWithinBounds(currentBlock) && !isOverlapping(currentBlock);

            if (canPlace) {
                console.log("Placing block at:", { x: currentBlock.x, y: currentBlock.y });
                currentBlock.isPlaced = true;
                placedBlocks.push({
                    x: currentBlock.x,
                    y: currentBlock.y,
                    colour: currentBlock.colour,
                    shape: currentBlock.shape.map(row => row.slice()),
                    isPlaced: true
                });
                console.log("mouseup Number of squares in placed block:", countOnes(currentBlock.shape));
                blocks = blocks.filter(b => b !== currentBlock);
                await clearFilledRowsAndColumns();
                score = score + countOnes(currentBlock.shape);
                movesSinceLastClear++;

                if (score > highscore) {
                    highscore = score;
                    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                        chrome.storage.local.set({ gameState: { score, highscore, comboLevel, movesSinceLastClear, blocks, placedBlocks } }, () => {
                            console.log("Highscore updated and game state saved to chrome.storage.local:", highscore);
                        });
                    } else {
                        localStorage.setItem('gameState', JSON.stringify({ score, highscore, comboLevel, movesSinceLastClear, blocks, placedBlocks }));
                        console.log("Highscore updated and game state saved to localStorage:", highscore);
                    }
                }

                console.log("Blocks after placement:", blocks);
                console.log("Placed blocks:", placedBlocks);

                if (blocks.length === 0) {
                    await new Promise(resolve => setTimeout(resolve, 400));
                    regenerateBlocks();
                    redrawAll();
                    if (checkGameOver()) {
                        isGameOver = true;
                        redrawAll();
                        ctx.save();
                        ctx.font = `bold ${30 * (canvas.width / 550)}px Handjet, Arial, sans-serif`;
                        ctx.fillStyle = "#a32f2f";
                        ctx.textAlign = "center";
                        ctx.fillText("Game Over! No valid moves left. Final Score: " + score, canvas.width / 2, 200 * (canvas.height / 700));
                        ctx.restore();
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        score = 0;
                        placedBlocks = [];
                        comboLevel = 0;
                        movesSinceLastClear = 0;
                        regenerateBlocks();
                        isGameOver = false;
                        redrawAll();
                    }
                } else if (checkGameOver()) {
                    isGameOver = true;
                    redrawAll();
                    ctx.save();
                    ctx.font = `bold ${30 * (canvas.width / 550)}px Handjet, Arial, sans-serif`;
                    ctx.fillStyle = "#a32f2f";
                    ctx.textAlign = "center";
                    ctx.fillText("Game Over! No valid moves left. Final Score: " + score, canvas.width / 2, 200 * (canvas.height / 700));
                    ctx.restore();
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    score = 0;
                    placedBlocks = [];
                    comboLevel = 0;
                    movesSinceLastClear = 0;
                    regenerateBlocks();
                    isGameOver = false;
                    redrawAll();
                }
            } else {
                currentBlock.x = currentBlock.originalX;
                currentBlock.y = currentBlock.originalY;
                console.log("Block returned to:", { x: currentBlock.x, y: currentBlock.y });
            }

            if (currentBlock) {
                currentBlock.isDragging = false;
                currentBlock.isPlaced = false;
            }
            currentBlock = null;

            blocks.forEach(block => {
                block.x = block.originalX;
                block.y = block.originalY;
                block.isDragging = false;
                block.isPlaced = false;
            });

            if (!isGameOver) {
                redrawAll();
            }
            saveGameState();
        });

        canvas.addEventListener("touchstart", function (e) {
            if (isDragging || isGameOver || isAnimating) return;
            let touch = e.touches[0];
            let rect = canvas.getBoundingClientRect();
            let x = (touch.clientX - rect.left) * (canvas.width / rect.width);
            let y = (touch.clientY - rect.top) * (canvas.height / rect.height);

            blocks.forEach((block) => {
                if (
                    !block.isPlaced &&
                    x >= block.x &&
                    x <= block.x + block.shape[0].length * smallSize &&
                    y >= block.y &&
                    y <= block.y + block.shape.length * smallSize
                ) {
                    isDragging = true;
                    block.isDragging = true;
                    currentBlock = block;
                    console.log("Selected block (touch):", block);
                    e.preventDefault();
                }
            });
        }, { passive: false });

        canvas.addEventListener("touchmove", function (e) {
            if (!isDragging || !currentBlock || currentBlock.isPlaced) return;
            let touch = e.touches[0];
            let rect = canvas.getBoundingClientRect();
            let x = (touch.clientX - rect.left) * (canvas.width / rect.width);
            let y = (touch.clientY - rect.top) * (canvas.height / rect.height);

            let rightFilled = getRightFilledCol(currentBlock.shape);
            let bottomFilled = getBottomFilledRow(currentBlock.shape);

            let gridX = Math.floor(x / size);
            let gridY = Math.floor(y / size);

            gridX = Math.max(0, Math.min(gridX, 8 - (rightFilled + 1)));
            gridY = Math.max(0, Math.min(gridY, 8 - (bottomFilled + 1)));

            currentBlock.x = gridX * size;
            currentBlock.y = gridY * size;

            redrawAll();
            e.preventDefault();
        }, { passive: false });

        canvas.addEventListener("touchend", async function (e) {
            lastTouchTime = Date.now();
            if (!isDragging || !currentBlock) return;
            isDragging = false;

            let canPlace = isWithinBounds(currentBlock) && !isOverlapping(currentBlock);

            if (canPlace) {
                console.log("Placing block at (touch):", { x: currentBlock.x, y: currentBlock.y });
                currentBlock.isPlaced = true;
                placedBlocks.push({
                    x: currentBlock.x,
                    y: currentBlock.y,
                    colour: currentBlock.colour,
                    shape: currentBlock.shape.map(row => row.slice()),
                    isPlaced: true
                });
                console.log("touchend Number of squares in placed block:", countOnes(currentBlock.shape));
                blocks = blocks.filter(b => b !== currentBlock);
                await clearFilledRowsAndColumns();
                score = score + countOnes(currentBlock.shape);
                movesSinceLastClear++;

                if (score > highscore) {
                    highscore = score;
                    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                        chrome.storage.local.set({ gameState: { score, highscore, comboLevel, movesSinceLastClear, blocks, placedBlocks } }, () => {
                            console.log("Highscore updated and game state saved to chrome.storage.local:", highscore);
                        });
                    } else {
                        localStorage.setItem('gameState', JSON.stringify({ score, highscore, comboLevel, movesSinceLastClear, blocks, placedBlocks }));
                        console.log("Highscore updated and game state saved to localStorage:", highscore);
                    }
                }

                console.log("Blocks after placement (touch):", blocks);
                console.log("Placed blocks (touch):", placedBlocks);

                if (blocks.length === 0) {
                    await new Promise(resolve => setTimeout(resolve, 400));
                    regenerateBlocks();
                    redrawAll();
                    if (checkGameOver()) {
                        isGameOver = true;
                        redrawAll();
                        ctx.save();
                        ctx.font = `bold ${30 * (canvas.width / 550)}px Handjet, Arial, sans-serif`;
                        ctx.fillStyle = "#a32f2f";
                        ctx.textAlign = "center";
                        ctx.fillText("Game Over! No valid moves left. Final Score: " + score, canvas.width / 2, 200 * (canvas.height / 700));
                        ctx.restore();
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        score = 0;
                        placedBlocks = [];
                        comboLevel = 0;
                        movesSinceLastClear = 0;
                        regenerateBlocks();
                        isGameOver = false;
                        redrawAll();
                    }
                } else if (checkGameOver()) {
                    isGameOver = true;
                    redrawAll();
                    ctx.save();
                    ctx.font = `bold ${30 * (canvas.width / 550)}px Handjet, Arial, sans-serif`;
                    ctx.fillStyle = "#a32f2f";
                    ctx.textAlign = "center";
                    ctx.fillText("Game Over! No valid moves left. Final Score: " + score, canvas.width / 2, 200 * (canvas.height / 700));
                    ctx.restore();
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    score = 0;
                    placedBlocks = [];
                    comboLevel = 0;
                    movesSinceLastClear = 0;
                    regenerateBlocks();
                    isGameOver = false;
                    redrawAll();
                }
            } else {
                currentBlock.x = currentBlock.originalX;
                currentBlock.y = currentBlock.originalY;
                console.log("Block returned to (touch):", { x: currentBlock.x, y: currentBlock.y });
            }

            if (currentBlock) {
                currentBlock.isDragging = false;
                currentBlock.isPlaced = false;
            }
            currentBlock = null;

            blocks.forEach(block => {
                block.x = block.originalX;
                block.y = block.originalY;
                block.isDragging = false;
                block.isPlaced = false;
            });

            if (!isGameOver) {
                redrawAll();
            }
            saveGameState();
        }, { passive: false });

        function resizeCanvas() {
            let maxWidth = Math.min(window.innerWidth * 0.98, 550);
            let scale = maxWidth / 550;
            canvas.width = maxWidth;
            canvas.height = 700 * scale;
            canvas.style.width = maxWidth + "px";
            canvas.style.height = (700 * scale) + "px";
            redrawAll();
        }

        // Initialize game by loading saved state
        async function initializeGame() {
            await loadGameState();
            resizeCanvas();
            redrawAll();
        }

        window.addEventListener('resize', resizeCanvas);
        initializeGame();