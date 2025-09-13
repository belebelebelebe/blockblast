const canvas = document.getElementById("MyCanvas");
const ctx = canvas.getContext("2d");

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
];
const size = 50;
const smallSize = 30;
var score = 0;

// Draw the grid
function drawGrid() {
    ctx.strokeStyle = "#aaa";
    ctx.lineWidth = 1;
    for (var i = 1; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(0, size * i);
        ctx.lineTo(400, size * i);
        ctx.stroke();
    }
    for (var i = 1; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(size * i, 0);
        ctx.lineTo(size * i, 400);
        ctx.stroke();
    }
    // Light grid background
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = "#5656ff";
    ctx.fillRect(0, 0, 400, 400);
    ctx.restore();
}

function drawScore(){
    ctx.save();
    ctx.font = "35px Handjet, Arial, sans-serif";
    ctx.fillStyle = "#323680";
    ctx.textBaseline = "top";
    ctx.fillText("Score: " + score, 410, 24);
    ctx.restore();
}

const startingPositions = [
    { x: 25, y: 450 },
    { x: 175, y: 450 },
    { x: 350, y: 450 }
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
    }
}

let blocks = [randomBlock(0), randomBlock(1), randomBlock(2)];
let placedBlocks = [];

// Draw a single block
function drawBlock(block, placed=false) {
    const blockSize = placed || block.isPlaced || block.isDragging ? size : smallSize;
    ctx.fillStyle = block.colour;
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
}

// Draw all blocks (placed and draggable)
function drawBlocks() {
    placedBlocks.forEach((block) => drawBlock(block, true));
    blocks.forEach((block) => drawBlock(block));
}

// Helper: get all filled squares of a block in grid coordinates
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

// Helper: check overlap with placed blocks
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

// Check if block is within grid bounds
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

// --------- ROW & COLUMN CLEAR LOGIC -----------

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

// Clear filled rows/columns
function clearFilledRowsAndColumns() {
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
    if (filledRows.length === 0 && filledCols.length === 0) return;

    // Remove filled cells from placedBlocks
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
    // Score: 10 points per clear, 20 for double, etc.
    score = score + 10 * (filledRows.length + filledCols.length);

    // Remove blocks that are now empty (all zeros)
    placedBlocks = placedBlocks.filter(block =>
        block.shape.some(row => row.some(cell => cell === 1))
    );
}

// -----------------------------------------------------------

// Helper for correct drag snapping
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

// Redraw all
function redrawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawBlocks();
    drawScore();
}

redrawAll();

// DRAG AND DROP HANDLERS
let isDragging = false;
let currentBlock = null;

canvas.addEventListener("mousedown", function (e) {
    if (isDragging) return;

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
        }
    });
});

canvas.addEventListener("mousemove", function (e) {
    if (!isDragging || !currentBlock || currentBlock.isPlaced) return;

    let rect = canvas.getBoundingClientRect();
    let x = (e.clientX - rect.left) * (canvas.width / rect.width);
    let y = (e.clientY - rect.top) * (canvas.height / rect.height);

    let rightFilled = getRightFilledCol(currentBlock.shape);
    let bottomFilled = getBottomFilledRow(currentBlock.shape);

    let minX = 0;
    let maxX = 350 - rightFilled * size;
    let minY = 0;
    let maxY = 350 - bottomFilled * size;

    currentBlock.x = Math.min(Math.max(Math.floor(x / size) * size, minX), maxX);
    currentBlock.y = Math.min(Math.max(Math.floor(y / size) * size, minY), maxY);

    redrawAll();
});

canvas.addEventListener("mouseup", function (e) {
    if (!isDragging || !currentBlock) return;
    isDragging = false;

    let rect = canvas.getBoundingClientRect();
    let mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    let mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Snap to grid
    currentBlock.x = Math.floor(mouseX / size) * size;
    currentBlock.y = Math.floor(mouseY / size) * size;

    let canPlace = isWithinBounds(currentBlock) && !isOverlapping(currentBlock);

    if (canPlace) {
        currentBlock.isPlaced = true;
        placedBlocks.push({
            x: currentBlock.x,
            y: currentBlock.y,
            colour: currentBlock.colour,
            shape: currentBlock.shape.map(row => row.slice()),
            isPlaced: true
        });
        blocks = blocks.filter(b => b !== currentBlock);

        clearFilledRowsAndColumns();
    } else {
        currentBlock.x = currentBlock.originalX;
        currentBlock.y = currentBlock.originalY;
    }

    if (currentBlock) currentBlock.isDragging = false;
    currentBlock = null;

    redrawAll();

    if (blocks.length === 0) {
        setTimeout(() => {
            regenerateBlocks();
            redrawAll();
        }, 400);
    }
});

// Touch events for mobile
canvas.addEventListener("touchstart", function (e) {
    if (isDragging) return;
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
            e.preventDefault();
        }
    });
}, {passive: false});

canvas.addEventListener("touchmove", function (e) {
    if (!isDragging || !currentBlock || currentBlock.isPlaced) return;
    let touch = e.touches[0];
    let rect = canvas.getBoundingClientRect();
    let x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    let y = (touch.clientY - rect.top) * (canvas.height / rect.height);

    let rightFilled = getRightFilledCol(currentBlock.shape);
    let bottomFilled = getBottomFilledRow(currentBlock.shape);

    let minX = 0;
    let maxX = 350 - rightFilled * size;
    let minY = 0;
    let maxY = 350 - bottomFilled * size;

    currentBlock.x = Math.min(Math.max(Math.floor(x / size) * size, minX), maxX);
    currentBlock.y = Math.min(Math.max(Math.floor(y / size) * size, minY), maxY);

    redrawAll();
    e.preventDefault();
}, {passive: false});

canvas.addEventListener("touchend", function (e) {
    if (!isDragging || !currentBlock) return;
    isDragging = false;
    // Use last known position
    let mouseX = currentBlock.x + size / 2;
    let mouseY = currentBlock.y + size / 2;

    currentBlock.x = Math.floor(mouseX / size) * size;
    currentBlock.y = Math.floor(mouseY / size) * size;

    let canPlace = isWithinBounds(currentBlock) && !isOverlapping(currentBlock);

    if (canPlace) {
        currentBlock.isPlaced = true;
        placedBlocks.push({
            x: currentBlock.x,
            y: currentBlock.y,
            colour: currentBlock.colour,
            shape: currentBlock.shape.map(row => row.slice()),
            isPlaced: true
        });
        blocks = blocks.filter(b => b !== currentBlock);

        clearFilledRowsAndColumns();
    } else {
        currentBlock.x = currentBlock.originalX;
        currentBlock.y = currentBlock.originalY;
    }

    if (currentBlock) currentBlock.isDragging = false;
    currentBlock = null;
    redrawAll();

    if (blocks.length === 0) {
        setTimeout(() => {
            regenerateBlocks();
            redrawAll();
        }, 400);
    }
}, {passive: false});

// Handle window resize for mobile: scale canvas
function resizeCanvas() {
    let maxWidth = Math.min(window.innerWidth * 0.98, 550);
    let scale = maxWidth / 550;
    canvas.style.width = maxWidth + "px";
    canvas.style.height = (700 * scale) + "px";
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();