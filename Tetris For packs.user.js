// ==UserScript==
// @name         Tetris Button Game
// @namespace    http://tampermonkey.net/
// @version      3.9
// @description  Play Tetris, unlock the button after losing
// @author       9003
// @match        https://www.nationstates.net/page=deck*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const Tetris = {
        board: [],
        cols: 10,
        rows: 20,
        nextPiece: null,
        score: 0,
        dropInterval: 500,
        colors: [
            'purple', // T-shape
            'yellow', // Square
            'cyan',   // Line
            'orange', // L-shape
            'blue',   // Reverse L-shape
            'green',  // S-shape
            'red',    // Z-shape
        ],
        isGameOver: function (piece) {
            return piece.blocks.some(([dx, dy]) => {
                const x = piece.x + dx;
                const y = piece.y + dy;
                return y >= 0 && this.board[y][x] === 1;
            }) || piece.blocks.some(([dx, dy]) => {
                const y = piece.y + dy;
                return y < 0; // Check if any block is above the board
            });
        },
        init: function (onGameOver) {
            const canvas = document.createElement('canvas');
            canvas.id = 'tetris-game';
            canvas.width = 200;
            canvas.height = 400;
            canvas.style.position = 'fixed';
            canvas.style.left = '50%';
            canvas.style.top = '50%';
            canvas.style.transform = 'translate(-50%, -50%)';
            canvas.style.border = '2px solid black';
            canvas.style.zIndex = 10000;
            document.body.appendChild(canvas);

            const previewCanvas = document.createElement('canvas');
            previewCanvas.id = 'tetris-preview';
            previewCanvas.width = 100;
            previewCanvas.height = 100;
            previewCanvas.style.position = 'fixed';
            previewCanvas.style.left = '70%';
            previewCanvas.style.top = '20%';
            previewCanvas.style.border = '1px solid black';
            previewCanvas.style.zIndex = 10001;
            document.body.appendChild(previewCanvas);

            const scoreDisplay = document.createElement('div');
            scoreDisplay.id = 'tetris-score';
            scoreDisplay.style.position = 'fixed';
            scoreDisplay.style.left = '70%';
            scoreDisplay.style.top = '30%';
            scoreDisplay.style.fontSize = '20px';
            scoreDisplay.style.zIndex = 10001;
            document.body.appendChild(scoreDisplay);

            const context = canvas.getContext('2d');
            const previewContext = previewCanvas.getContext('2d');

            this.board = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
            let currentPiece = this.randomPiece();
            this.nextPiece = this.randomPiece();
            let gameOver = false;

            const drawBlock = (x, y, color, ctx) => {
                ctx.fillStyle = color;
                ctx.fillRect(x * 20, y * 20, 20, 20);
                ctx.strokeStyle = 'black';
                ctx.strokeRect(x * 20, y * 20, 20, 20);
            };

            const drawBoard = () => {
                context.clearRect(0, 0, canvas.width, canvas.height);
                for (let y = 0; y < this.rows; y++) {
                    for (let x = 0; x < this.cols; x++) {
                        if (this.board[y][x]) {
                            drawBlock(x, y, this.board[y][x], context);
                        }
                    }
                }
                currentPiece.blocks.forEach(([dx, dy]) => {
                    drawBlock(currentPiece.x + dx, currentPiece.y + dy, currentPiece.color, context);
                });
            };

            const drawPreview = () => {
                previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                this.nextPiece.blocks.forEach(([dx, dy]) => {
                    drawBlock(dx + 2, dy + 2, this.nextPiece.color, previewContext);
                });
            };

            const updateScore = () => {
                scoreDisplay.textContent = `Score: ${this.score}`;
            };

            const movePiece = (dx, dy) => {
                currentPiece.x += dx;
                currentPiece.y += dy;
                if (!isValidMove()) {
                    currentPiece.x -= dx;
                    currentPiece.y -= dy;
                    if (dy === 1) {
                        lockPiece();
                    }
                    return false;
                }
                return true;
            };

            const rotatePiece = () => {
                const rotatedBlocks = currentPiece.blocks.map(([dx, dy]) => [-dy, dx]);
                const originalBlocks = currentPiece.blocks;
                currentPiece.blocks = rotatedBlocks;
                if (!isValidMove()) {
                    currentPiece.blocks = originalBlocks; // Revert if invalid
                }
            };

            const dropPiece = () => {
                while (movePiece(0, 1)) {}
            };

            const isValidMove = () => {
                return currentPiece.blocks.every(([dx, dy]) => {
                    const newX = currentPiece.x + dx;
                    const newY = currentPiece.y + dy;
                    return newX >= 0 && newX < this.cols && newY < this.rows && (newY < 0 || !this.board[newY][newX]);
                });
            };

            const lockPiece = () => {
                currentPiece.blocks.forEach(([dx, dy]) => {
                    const x = currentPiece.x + dx;
                    const y = currentPiece.y + dy;
                    if (y >= 0) {
                        this.board[y][x] = currentPiece.color;
                    }
                });

                clearLines();
                currentPiece = this.nextPiece;
                this.nextPiece = this.randomPiece();
                drawPreview();

                this.dropInterval = Math.max(200, this.dropInterval - 15); // Slower speed increase

                if (this.isGameOver(currentPiece)) {
                    gameOver = true;
                    onGameOver();
                    document.body.removeChild(canvas);
                }
            };

            const clearLines = () => {
                for (let y = this.rows - 1; y >= 0; y--) {
                    if (this.board[y].every(cell => cell)) {
                        this.board.splice(y, 1);
                        this.board.unshift(Array(this.cols).fill(0));
                        y++;
                        this.score += Math.floor(10000 / this.dropInterval); // Higher points for faster drop speed
                        updateScore();
                    }
                }
            };

            const gameLoop = () => {
                if (!gameOver) {
                    if (!movePiece(0, 1)) {
                    }
                    drawBoard();
                    setTimeout(gameLoop, this.dropInterval);
                }
            };

            document.addEventListener('keydown', (e) => {
                if (gameOver) return;
                switch (e.key) {
                    case 'ArrowLeft':
                        movePiece(-1, 0);
                        break;
                    case 'ArrowRight':
                        movePiece(1, 0);
                        break;
                    case 'ArrowDown':
                        dropPiece();
                        e.preventDefault(); // Prevent page scrolling
                        break;
                    case 'ArrowUp':
                        rotatePiece();
                        break;
                }
                drawBoard();
            });

            updateScore();
            drawPreview();
            gameLoop();
        },

        randomPiece: function () {
            const shapes = [
                [[0, 0], [1, 0], [-1, 0], [0, -1]], // T-shape
                [[0, 0], [1, 0], [0, -1], [1, -1]], // Square
                [[0, 0], [0, -1], [0, -2], [0, -3]], // Line
                [[0, 0], [1, 0], [2, 0], [0, -1]], // L-shape
                [[0, 0], [-1, 0], [-2, 0], [0, -1]], // Reverse L-shape
                [[0, 0], [1, 0], [0, -1], [-1, -1]], // S-shape
                [[0, 0], [-1, 0], [0, -1], [1, -1]], // Z-shape
            ];
            const index = Math.floor(Math.random() * shapes.length);
            const blocks = shapes[index];
            const color = this.colors[index];
            return { x: 4, y: 1, blocks, color }; // Start just below the top of the board
        },
    };

    // Lock the button initially
    const button = document.querySelector('button.button.lootboxbutton[name="open_loot_box"][value="1"]');
    if (button) {
        button.disabled = true;

        Tetris.init(() => {
            // After losing the game, unlock the button
            button.disabled = false;
            alert('Game over! The button is now unlocked.');
        });
    }
})();
