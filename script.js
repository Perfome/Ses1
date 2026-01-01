// Canvas ve context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Canvas boyutları
canvas.width = 1000;
canvas.height = 600;

// Game state
let gameState = {
    difficulty: 'easy',
    score: 0,
    playerHp: 4000,
    botHp: 4000,
    maxHp: 4000,
    shotsFired: 0,
    shotsHit: 0,
    gameActive: false
};

// Player
const player = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    radius: 25,
    color: '#ff69b4',
    speed: 0,
    velocityX: 0,
    velocityY: 0,
    aimAngle: 0,
    aimLength: 100,
    canShoot: true,
    shootCooldown: 500
};

// Bot
const bot = {
    x: canvas.width / 2,
    y: 100,
    radius: 25,
    color: '#4169e1',
    speed: 2,
    velocityX: 0,
    velocityY: 0,
    aimAngle: 0,
    aimLength: 100,
    canShoot: true,
    shootCooldown: 1000,
    reactionTime: 500
};

// Projectiles
let playerBullets = [];
let botBullets = [];

// Joystick state
let joystickActive = false;
let joystickStartX = 0;
let joystickStartY = 0;
let joystickDeltaX = 0;
let joystickDeltaY = 0;

// Difficulty settings
const difficultySettings = {
    easy: {
        botSpeed: 1.5,
        botShootCooldown: 2000,
        botAccuracy: 0.3,
        botDodgeChance: 0.2
    },
    medium: {
        botSpeed: 2.5,
        botShootCooldown: 1200,
        botAccuracy: 0.6,
        botDodgeChance: 0.5
    },
    hard: {
        botSpeed: 3.5,
        botShootCooldown: 800,
        botAccuracy: 0.95,
        botDodgeChance: 0.85
    }
};

// Start game
function startGame(difficulty) {
    gameState.difficulty = difficulty;
    gameState.score = 0;
    gameState.playerHp = 4000;
    gameState.botHp = 4000;
    gameState.shotsFired = 0;
    gameState.shotsHit = 0;
    gameState.gameActive = true;
    
    // Apply difficulty settings
    const settings = difficultySettings[difficulty];
    bot.speed = settings.botSpeed;
    bot.shootCooldown = settings.botShootCooldown;
    
    // Reset positions
    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
    bot.x = canvas.width / 2;
    bot.y = 100;
    
    playerBullets = [];
    botBullets = [];
    
    document.getElementById('menuScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');
    
    updateStats();
    gameLoop();
    botAI();
}

function showMenu() {
    gameState.gameActive = false;
    document.getElementById('gameOverScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('menuScreen').classList.add('active');
}

// Update stats display
function updateStats() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('playerHp').textContent = gameState.playerHp;
    document.getElementById('botHp').textContent = gameState.botHp;
    
    const playerHpPercent = (gameState.playerHp / gameState.maxHp) * 100;
    const botHpPercent = (gameState.botHp / gameState.maxHp) * 100;
    
    document.getElementById('playerHpBar').style.width = playerHpPercent + '%';
    document.getElementById('botHpBar').style.width = botHpPercent + '%';
}

// Joystick controls
const joystickContainer = document.getElementById('joystickContainer');
const joystickStick = document.getElementById('joystickStick');

joystickContainer.addEventListener('touchstart', handleJoystickStart);
joystickContainer.addEventListener('touchmove', handleJoystickMove);
joystickContainer.addEventListener('touchend', handleJoystickEnd);
joystickContainer.addEventListener('mousedown', handleJoystickStart);
document.addEventListener('mousemove', handleJoystickMove);
document.addEventListener('mouseup', handleJoystickEnd);

function handleJoystickStart(e) {
    e.preventDefault();
    joystickActive = true;
    const rect = joystickContainer.getBoundingClientRect();
    joystickStartX = rect.left + rect.width / 2;
    joystickStartY = rect.top + rect.height / 2;
}

function handleJoystickMove(e) {
    if (!joystickActive) return;
    e.preventDefault();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    joystickDeltaX = clientX - joystickStartX;
    joystickDeltaY = clientY - joystickStartY;
    
    const distance = Math.sqrt(joystickDeltaX ** 2 + joystickDeltaY ** 2);
    const maxDistance = 45;
    
    if (distance > maxDistance) {
        joystickDeltaX = (joystickDeltaX / distance) * maxDistance;
        joystickDeltaY = (joystickDeltaY / distance) * maxDistance;
    }
    
    joystickStick.style.transform = `translate(calc(-50% + ${joystickDeltaX}px), calc(-50% + ${joystickDeltaY}px))`;
    
    // Update player velocity
    player.velocityX = (joystickDeltaX / maxDistance) * 5;
    player.velocityY = (joystickDeltaY / maxDistance) * 5;
}

function handleJoystickEnd(e) {
    if (!joystickActive) return;
    joystickActive = false;
    joystickDeltaX = 0;
    joystickDeltaY = 0;
    joystickStick.style.transform = 'translate(-50%, -50%)';
    player.velocityX = 0;
    player.velocityY = 0;
}

// Mouse aim
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    player.aimAngle = Math.atan2(mouseY - player.y, mouseX - player.x);
});

// Fire button
const fireButton = document.getElementById('fireButton');
fireButton.addEventListener('click', () => playerShoot());
fireButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    playerShoot();
});

// Shooting
function playerShoot() {
    if (!player.canShoot || !gameState.gameActive) return;
    
    const bulletSpeed = 8;
    playerBullets.push({
        x: player.x,
        y: player.y,
        velocityX: Math.cos(player.aimAngle) * bulletSpeed,
        velocityY: Math.sin(player.aimAngle) * bulletSpeed,
        radius: 8,
        damage: 600
    });
    
    gameState.shotsFired++;
    player.canShoot = false;
    setTimeout(() => player.canShoot = true, player.shootCooldown);
}

function botShoot() {
    if (!bot.canShoot || !gameState.gameActive) return;
    
    const settings = difficultySettings[gameState.difficulty];
    
    // Calculate aim with accuracy
    let targetX = player.x;
    let targetY = player.y;
    
    // Add inaccuracy
    const inaccuracy = 1 - settings.botAccuracy;
    targetX += (Math.random() - 0.5) * 200 * inaccuracy;
    targetY += (Math.random() - 0.5) * 200 * inaccuracy;
    
    const angle = Math.atan2(targetY - bot.y, targetX - bot.x);
    const bulletSpeed = 8;
    
    botBullets.push({
        x: bot.x,
        y: bot.y,
        velocityX: Math.cos(angle) * bulletSpeed,
        velocityY: Math.sin(angle) * bulletSpeed,
        radius: 8,
        damage: 600
    });
    
    bot.canShoot = false;
    setTimeout(() => bot.canShoot = true, bot.shootCooldown);
}

// Bot AI
function botAI() {
    if (!gameState.gameActive) return;
    
    const settings = difficultySettings[gameState.difficulty];
    
    // Movement AI
    setInterval(() => {
        if (!gameState.gameActive) return;
        
        // Random movement
        if (Math.random() < 0.3) {
            bot.velocityX = (Math.random() - 0.5) * bot.speed * 2;
            bot.velocityY = (Math.random() - 0.5) * bot.speed * 2;
        }
        
        // Dodge incoming bullets
        if (Math.random() < settings.botDodgeChance) {
            playerBullets.forEach(bullet => {
                const distToBullet = Math.sqrt((bullet.x - bot.x) ** 2 + (bullet.y - bot.y) ** 2);
                if (distToBullet < 150) {
                    // Dodge perpendicular to bullet direction
                    const dodgeAngle = Math.atan2(bullet.velocityY, bullet.velocityX) + Math.PI / 2;
                    bot.velocityX = Math.cos(dodgeAngle) * bot.speed * 3;
                    bot.velocityY = Math.sin(dodgeAngle) * bot.speed * 3;
                }
            });
        }
    }, 200);
    
    // Shooting AI
    setInterval(() => {
        if (!gameState.gameActive) return;
        botShoot();
    }, bot.shootCooldown);
}

// Update game
function update() {
    if (!gameState.gameActive) return;
    
    // Update player position
    player.x += player.velocityX;
    player.y += player.velocityY;
    
    // Keep player in bounds
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius + 50, Math.min(canvas.height - player.radius, player.y));
    
    // Update bot position
    bot.x += bot.velocityX;
    bot.y += bot.velocityY;
    
    // Keep bot in bounds
    bot.x = Math.max(bot.radius, Math.min(canvas.width - bot.radius, bot.x));
    bot.y = Math.max(bot.radius, Math.min(canvas.height / 2 - bot.radius, bot.y));
    
    // Decay bot velocity
    bot.velocityX *= 0.95;
    bot.velocityY *= 0.95;
    
    // Update player bullets
    playerBullets = playerBullets.filter(bullet => {
        bullet.x += bullet.velocityX;
        bullet.y += bullet.velocityY;
        
        // Check collision with bot
        const dist = Math.sqrt((bullet.x - bot.x) ** 2 + (bullet.y - bot.y) ** 2);
        if (dist < bot.radius + bullet.radius) {
            gameState.botHp = Math.max(0, gameState.botHp - bullet.damage);
            gameState.score += 100;
            gameState.shotsHit++;
            updateStats();
            
            if (gameState.botHp <= 0) {
                endGame(true);
            }
            return false;
        }
        
        // Remove if out of bounds
        return bullet.x > 0 && bullet.x < canvas.width && bullet.y > 0 && bullet.y < canvas.height;
    });
    
    // Update bot bullets
    botBullets = botBullets.filter(bullet => {
        bullet.x += bullet.velocityX;
        bullet.y += bullet.velocityY;
        
        // Check collision with player
        const dist = Math.sqrt((bullet.x - player.x) ** 2 + (bullet.y - player.y) ** 2);
        if (dist < player.radius + bullet.radius) {
            gameState.playerHp = Math.max(0, gameState.playerHp - bullet.damage);
            updateStats();
            
            if (gameState.playerHp <= 0) {
                endGame(false);
            }
            return false;
        }
        
        // Remove if out of bounds
        return bullet.x > 0 && bullet.x < canvas.width && bullet.y > 0 && bullet.y < canvas.height;
    });
}

// Draw game
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw arena boundary
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    
    // Draw bot
    ctx.fillStyle = bot.color;
    ctx.beginPath();
    ctx.arc(bot.x, bot.y, bot.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw bot aim line
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bot.x, bot.y);
    const botAimAngle = Math.atan2(player.y - bot.y, player.x - bot.x);
    ctx.lineTo(bot.x + Math.cos(botAimAngle) * bot.aimLength, 
               bot.y + Math.sin(botAimAngle) * bot.aimLength);
    ctx.stroke();
    
    // Draw player
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw player aim line
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + Math.cos(player.aimAngle) * player.aimLength, 
               player.y + Math.sin(player.aimAngle) * player.aimLength);
    ctx.stroke();
    
    // Draw player bullets
    ctx.fillStyle = '#00ff00';
    playerBullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
    
    // Draw bot bullets
    ctx.fillStyle = '#ff0000';
    botBullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

// Game loop
function gameLoop() {
    if (!gameState.gameActive) return;
    
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// End game
function endGame(playerWon) {
    gameState.gameActive = false;
    
    const accuracy = gameState.shotsFired > 0 ? 
        Math.round((gameState.shotsHit / gameState.shotsFired) * 100) : 0;
    
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('accuracy').textContent = accuracy + '%';
    
    const resultText = document.getElementById('resultText');
    if (playerWon) {
        resultText.textContent = 'KAZANDIN! 🎉';
        resultText.className = 'win';
    } else {
        resultText.textContent = 'KAYBETTİN 😢';
        resultText.className = 'lose';
    }
    
    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('gameOverScreen').classList.add('active');
}

// Initialize
document.getElementById('menuScreen').classList.add('active');
