// 게임 상수 및 변수 정의
const CELL_SIZE = 40; // 셀 크기
const PLAYER_SIZE = 25; // 플레이어 크기 (줄임)
const ZOMBIE_SIZE = 30; // 좀비 크기
const ITEM_SIZE = 20; // 아이템 크기
const PLAYER_SPEED = 5; // 플레이어 속도
const ZOMBIE_SPEED = 2; // 좀비 속도

// 이미지 및 오디오 요소
const wallImage = new Image();
wallImage.src = '벽.png';

const zombieImage = new Image();
zombieImage.src = '좀비.png';

const playerImage = new Image();
playerImage.src = '여행자.png';

const bgMusic = new Audio('미로의 속삭임.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.5;

// 게임 요소
let canvas, ctx;
let gameInterval;
let score = 0;
let health = 100;
let level = 1;
let maze = [];
let player = {};
let zombies = [];
let items = [];
let exit = {};
let keys = {};
let gameRunning = false;

// DOM 요소
const gameContainer = document.querySelector('.game-container');
const gameMenu = document.getElementById('gameMenu');
const gameOver = document.getElementById('gameOver');
const howToPlayMenu = document.getElementById('howToPlayMenu');
const startGameBtn = document.getElementById('startGame');
const howToPlayBtn = document.getElementById('howToPlay');
const restartGameBtn = document.getElementById('restartGame');
const backToMenuBtn = document.getElementById('backToMenu');
const scoreDisplay = document.getElementById('score');
const healthDisplay = document.getElementById('health');
const levelDisplay = document.getElementById('level');
const finalScoreDisplay = document.getElementById('finalScore');

// 이벤트 리스너 설정
startGameBtn.addEventListener('click', startGame);
howToPlayBtn.addEventListener('click', showHowToPlay);
restartGameBtn.addEventListener('click', startGame);
backToMenuBtn.addEventListener('click', backToMenu);

// 키보드 이벤트 리스너
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// 게임 초기화
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // 캔버스 크기 설정
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // 게임 상태 초기화
    score = 0;
    health = 100;
    level = 1;
    gameRunning = true;
    
    // 화면 업데이트
    updateUI();
    
    // 미로 생성
    generateMaze();
    
    // 플레이어 초기화
    initPlayer();
    
    // 좀비 초기화
    initZombies();
    
    // 아이템 초기화
    initItems();
    
    // 출구 초기화
    initExit();
}

// 미로 생성 알고리즘 (깊이 우선 탐색)
function generateMaze() {
    const rows = Math.floor(canvas.height / CELL_SIZE);
    const cols = Math.floor(canvas.width / CELL_SIZE);
    
    // 미로 초기화 (모든 벽 설정)
    maze = [];
    for (let i = 0; i < rows; i++) {
        maze[i] = [];
        for (let j = 0; j < cols; j++) {
            maze[i][j] = {
                x: j * CELL_SIZE,
                y: i * CELL_SIZE,
                walls: [true, true, true, true], // 상, 우, 하, 좌
                visited: false
            };
        }
    }
    
    // 깊이 우선 탐색으로 미로 생성
    const stack = [];
    let current = maze[0][0];
    current.visited = true;
    
    function getNeighbors(row, col) {
        const neighbors = [];
        const directions = [
            [row - 1, col, 0, 2], // 상
            [row, col + 1, 1, 3], // 우
            [row + 1, col, 2, 0], // 하
            [row, col - 1, 3, 1]  // 좌
        ];
        
        for (const [r, c, wallIndex, oppositeWall] of directions) {
            if (r >= 0 && r < rows && c >= 0 && c < cols && !maze[r][c].visited) {
                neighbors.push([r, c, wallIndex, oppositeWall]);
            }
        }
        
        return neighbors;
    }
    
    while (true) {
        const row = Math.floor(current.y / CELL_SIZE);
        const col = Math.floor(current.x / CELL_SIZE);
        const neighbors = getNeighbors(row, col);
        
        if (neighbors.length > 0) {
            const [nextRow, nextCol, wallIndex, oppositeWall] = neighbors[Math.floor(Math.random() * neighbors.length)];
            
            // 벽 제거
            maze[row][col].walls[wallIndex] = false;
            maze[nextRow][nextCol].walls[oppositeWall] = false;
            
            // 다음 셀 방문
            maze[nextRow][nextCol].visited = true;
            stack.push(current);
            current = maze[nextRow][nextCol];
        } else if (stack.length > 0) {
            current = stack.pop();
        } else {
            break;
        }
    }
    
    // 미로 복잡도 조정 (레벨에 따라 벽 추가 제거)
    adjustMazeDifficulty();
}

// 미로 복잡도 조정
function adjustMazeDifficulty() {
    const rows = maze.length;
    const cols = maze[0].length;
    
    // 레벨에 따라 벽 제거 확률 조정
    const removalProbability = 0.1 + (level * 0.02);
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            // 랜덤하게 벽 제거
            for (let w = 0; w < 4; w++) {
                if (maze[i][j].walls[w] && Math.random() < removalProbability) {
                    maze[i][j].walls[w] = false;
                    
                    // 인접한 셀의 반대쪽 벽도 제거
                    const directions = [
                        [i - 1, j, 2], // 상
                        [i, j + 1, 3], // 우
                        [i + 1, j, 0], // 하
                        [i, j - 1, 1]  // 좌
                    ];
                    
                    const [ni, nj, oppositeWall] = directions[w];
                    if (ni >= 0 && ni < rows && nj >= 0 && nj < cols) {
                        maze[ni][nj].walls[oppositeWall] = false;
                    }
                }
            }
        }
    }
}

// 플레이어 초기화
function initPlayer() {
    player = {
        x: CELL_SIZE / 2,
        y: CELL_SIZE / 2,
        size: PLAYER_SIZE,
        speed: PLAYER_SPEED,
        color: '#3498db'
    };
}

// 좀비 초기화
function initZombies() {
    zombies = [];
    const zombieCount = 3 + level; // 레벨에 따라 좀비 수 증가
    
    for (let i = 0; i < zombieCount; i++) {
        // 미로의 랜덤한 위치에 좀비 배치 (플레이어와 일정 거리 이상 떨어진 곳)
        let x, y;
        do {
            const row = Math.floor(Math.random() * maze.length);
            const col = Math.floor(Math.random() * maze[0].length);
            x = col * CELL_SIZE + CELL_SIZE / 2;
            y = row * CELL_SIZE + CELL_SIZE / 2;
        } while (distance(x, y, player.x, player.y) < 5 * CELL_SIZE);
        
        zombies.push({
            x: x,
            y: y,
            size: ZOMBIE_SIZE,
            speed: ZOMBIE_SPEED * (0.8 + Math.random() * 0.4), // 속도 약간 랜덤화
            color: '#e74c3c',
            direction: Math.random() * Math.PI * 2, // 초기 방향 랜덤
            lastPathfindTime: 0
        });
    }
}

// 아이템 초기화
function initItems() {
    items = [];
    const itemCount = 5 + level; // 레벨에 따라 아이템 수 증가
    
    const itemTypes = [
        { type: 'health', color: '#2ecc71', value: 20 },
        { type: 'score', color: '#f1c40f', value: 50 },
        { type: 'speed', color: '#9b59b6', value: 1 }
    ];
    
    for (let i = 0; i < itemCount; i++) {
        // 미로의 랜덤한 위치에 아이템 배치
        const row = Math.floor(Math.random() * maze.length);
        const col = Math.floor(Math.random() * maze[0].length);
        const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
        
        items.push({
            x: col * CELL_SIZE + CELL_SIZE / 2,
            y: row * CELL_SIZE + CELL_SIZE / 2,
            size: ITEM_SIZE,
            color: itemType.color,
            type: itemType.type,
            value: itemType.value,
            collected: false
        });
    }
}

// 출구 초기화
function initExit() {
    // 미로의 가장 먼 지점에 출구 배치
    const rows = maze.length;
    const cols = maze[0].length;
    
    exit = {
        x: (cols - 1) * CELL_SIZE + CELL_SIZE / 2,
        y: (rows - 1) * CELL_SIZE + CELL_SIZE / 2,
        size: CELL_SIZE * 0.8,
        color: '#27ae60'
    };
}

// 게임 시작
function startGame() {
    gameMenu.style.display = 'none';
    gameOver.style.display = 'none';
    gameContainer.style.display = 'block';
    
    init();
    
    // 배경 음악 재생
    bgMusic.currentTime = 0;
    bgMusic.play().catch(error => {
        console.log('배경 음악 재생 실패:', error);
    });
    
    // 게임 루프 시작
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, 1000 / 60); // 60 FPS
}

// 게임 방법 표시
function showHowToPlay() {
    gameMenu.style.display = 'none';
    howToPlayMenu.style.display = 'block';
}

// 메뉴로 돌아가기
function backToMenu() {
    howToPlayMenu.style.display = 'none';
    gameMenu.style.display = 'block';
}

// 게임 오버
function endGame() {
    gameRunning = false;
    clearInterval(gameInterval);
    
    // 배경 음악 중지
    bgMusic.pause();
    
    finalScoreDisplay.textContent = score;
    gameContainer.style.display = 'none';
    gameOver.style.display = 'block';
}

// UI 업데이트
function updateUI() {
    scoreDisplay.textContent = score;
    healthDisplay.textContent = health;
    levelDisplay.textContent = level;
}

// 게임 루프
function gameLoop() {
    if (!gameRunning) return;
    
    // 화면 지우기
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 미로 그리기
    drawMaze();
    
    // 출구 그리기
    drawExit();
    
    // 아이템 그리기 및 수집 확인
    updateItems();
    
    // 플레이어 업데이트 및 그리기
    updatePlayer();
    
    // 좀비 업데이트 및 그리기
    updateZombies();
    
    // 충돌 확인
    checkCollisions();
    
    // 레벨 클리어 확인
    checkLevelComplete();
}

// 미로 그리기
function drawMaze() {
    const rows = maze.length;
    const cols = maze[0].length;
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const cell = maze[i][j];
            
            // 벽 그리기
            if (cell.walls[0]) { // 상
                ctx.drawImage(wallImage, cell.x, cell.y - 2, CELL_SIZE, 4);
            }
            
            if (cell.walls[1]) { // 우
                ctx.drawImage(wallImage, cell.x + CELL_SIZE - 2, cell.y, 4, CELL_SIZE);
            }
            
            if (cell.walls[2]) { // 하
                ctx.drawImage(wallImage, cell.x, cell.y + CELL_SIZE - 2, CELL_SIZE, 4);
            }
            
            if (cell.walls[3]) { // 좌
                ctx.drawImage(wallImage, cell.x - 2, cell.y, 4, CELL_SIZE);
            }
        }
    }
}

// 출구 그리기
function drawExit() {
    ctx.fillStyle = exit.color;
    ctx.beginPath();
    ctx.arc(exit.x, exit.y, exit.size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // 출구 표시
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', exit.x, exit.y);
}

// 플레이어 업데이트 및 그리기
function updatePlayer() {
    // 키보드 입력에 따른 이동
    const newX = player.x;
    const newY = player.y;
    
    if (keys['ArrowUp'] || keys['w']) {
        player.y -= player.speed;
    }
    if (keys['ArrowDown'] || keys['s']) {
        player.y += player.speed;
    }
    if (keys['ArrowLeft'] || keys['a']) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight'] || keys['d']) {
        player.x += player.speed;
    }
    
    // 벽 충돌 확인
    if (checkWallCollision(player)) {
        player.x = newX;
        player.y = newY;
    }
    
    // 플레이어 그리기
    const playerDrawSize = player.size * 1.5; // 이미지 크기 조정
    ctx.drawImage(playerImage, player.x - playerDrawSize/2, player.y - playerDrawSize/2, playerDrawSize, playerDrawSize);
}

// 좀비 업데이트 및 그리기
function updateZombies() {
    const currentTime = Date.now();
    
    zombies.forEach(zombie => {
        // 좀비 AI - 플레이어 추적
        if (currentTime - zombie.lastPathfindTime > 500) { // 0.5초마다 경로 재계산
            // 플레이어 방향으로 이동
            const dx = player.x - zombie.x;
            const dy = player.y - zombie.y;
            const angle = Math.atan2(dy, dx);
            
            // 약간의 랜덤성 추가
            zombie.direction = angle + (Math.random() - 0.5) * 0.5;
            zombie.lastPathfindTime = currentTime;
        }
        
        // 좀비 이동
        const newX = zombie.x + Math.cos(zombie.direction) * zombie.speed;
        const newY = zombie.y + Math.sin(zombie.direction) * zombie.speed;
        
        // 임시로 위치 업데이트
        const oldX = zombie.x;
        const oldY = zombie.y;
        zombie.x = newX;
        zombie.y = newY;
        
        // 벽 충돌 확인
        if (checkWallCollision(zombie)) {
            // 충돌 시 원래 위치로 복원하고 방향 변경
            zombie.x = oldX;
            zombie.y = oldY;
            zombie.direction += Math.PI / 2 + Math.random() * Math.PI; // 90-270도 회전
        }
        
        // 좀비 그리기
        const zombieDrawSize = zombie.size * 1.5; // 이미지 크기 조정
        ctx.drawImage(zombieImage, zombie.x - zombieDrawSize/2, zombie.y - zombieDrawSize/2, zombieDrawSize, zombieDrawSize);
    });
}

// 아이템 업데이트 및 그리기
function updateItems() {
    items.forEach(item => {
        if (!item.collected) {
            // 아이템 그리기
            ctx.fillStyle = item.color;
            ctx.beginPath();
            ctx.arc(item.x, item.y, item.size / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // 아이템 타입 표시
            ctx.fillStyle = '#fff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            let symbol = '?';
            if (item.type === 'health') symbol = 'H';
            if (item.type === 'score') symbol = 'S';
            if (item.type === 'speed') symbol = '+';
            
            ctx.fillText(symbol, item.x, item.y);
        }
    });
}

// 충돌 확인
function checkCollisions() {
    // 좀비와 플레이어 충돌
    zombies.forEach(zombie => {
        if (distance(player.x, player.y, zombie.x, zombie.y) < (player.size + zombie.size) / 2) {
            // 충돌 시 체력 감소 (공격력 감소)
            health -= 2;
            updateUI();
            
            // 플레이어 넉백
            const angle = Math.atan2(player.y - zombie.y, player.x - zombie.x);
            player.x += Math.cos(angle) * 20;
            player.y += Math.sin(angle) * 20;
            
            // 벽 충돌 확인 (넉백 후)
            if (checkWallCollision(player)) {
                player.x -= Math.cos(angle) * 20;
                player.y -= Math.sin(angle) * 20;
            }
            
            // 체력이 0 이하면 게임 오버
            if (health <= 0) {
                endGame();
            }
        }
    });
    
    // 아이템과 플레이어 충돌
    items.forEach(item => {
        if (!item.collected && distance(player.x, player.y, item.x, item.y) < (player.size + item.size) / 2) {
            // 아이템 수집
            item.collected = true;
            
            // 아이템 효과 적용
            if (item.type === 'health') {
                health = Math.min(100, health + item.value);
            } else if (item.type === 'score') {
                score += item.value;
            } else if (item.type === 'speed') {
                player.speed += item.value;
            }
            
            // UI 업데이트
            updateUI();
        }
    });
}

// 레벨 클리어 확인
function checkLevelComplete() {
    if (distance(player.x, player.y, exit.x, exit.y) < (player.size + exit.size) / 2) {
        // 레벨 클리어
        level++;
        score += level * 100; // 레벨 보너스
        
        // 다음 레벨 시작
        init();
    }
}

// 벽 충돌 확인
function checkWallCollision(entity) {
    const row = Math.floor(entity.y / CELL_SIZE);
    const col = Math.floor(entity.x / CELL_SIZE);
    
    // 맵 경계 확인
    if (row < 0 || row >= maze.length || col < 0 || col >= maze[0].length) {
        return true;
    }
    
    // 엔티티의 경계 상자
    const halfSize = entity.size / 2;
    const left = entity.x - halfSize;
    const right = entity.x + halfSize;
    const top = entity.y - halfSize;
    const bottom = entity.y + halfSize;
    
    // 주변 셀 확인
    for (let i = Math.floor(top / CELL_SIZE); i <= Math.floor(bottom / CELL_SIZE); i++) {
        for (let j = Math.floor(left / CELL_SIZE); j <= Math.floor(right / CELL_SIZE); j++) {
            if (i >= 0 && i < maze.length && j >= 0 && j < maze[0].length) {
                const cell = maze[i][j];
                
                // 벽과의 충돌 확인
                if (cell.walls[0] && top <= cell.y && bottom > cell.y && 
                    left < cell.x + CELL_SIZE && right > cell.x) {
                    return true;
                }
                
                if (cell.walls[1] && left < cell.x + CELL_SIZE && right > cell.x + CELL_SIZE && 
                    top < cell.y + CELL_SIZE && bottom > cell.y) {
                    return true;
                }
                
                if (cell.walls[2] && top < cell.y + CELL_SIZE && bottom > cell.y + CELL_SIZE && 
                    left < cell.x + CELL_SIZE && right > cell.x) {
                    return true;
                }
                
                if (cell.walls[3] && left <= cell.x && right > cell.x && 
                    top < cell.y + CELL_SIZE && bottom > cell.y) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

// 두 점 사이의 거리 계산
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// 창 크기 변경 시 캔버스 크기 조정
window.addEventListener('resize', () => {
    if (gameRunning) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }
});

// 이미지 로딩 완료 확인
let imagesLoaded = 0;
const totalImages = 3; // 총 이미지 수

function checkAllImagesLoaded() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        // 모든 이미지가 로드되면 게임 메뉴 표시
        gameMenu.style.display = 'block';
    }
}

// 이미지 로드 이벤트 리스너 추가
wallImage.onload = checkAllImagesLoaded;
zombieImage.onload = checkAllImagesLoaded;
playerImage.onload = checkAllImagesLoaded;