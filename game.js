const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set Canvas to Fullscreen
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game Variables
let player = {
    x: canvas.width / 2 - 20,
    y: canvas.height - 80,
    width: 40,
    height: 40,
    color: '#d56073', // Your custom player color
    velX: 0,
    velY: 0,
    speed: 5,
    jumpStrength: 30, // Your custom jump strength
    onGround: false,
    jumpCount: 0,
    isTeleporting: false // Flag to prevent jump during teleport
};

let keys = {};
let gravity = 0.25; // Your custom gravity
let friction = 0.9;
let platforms = [];
let projectiles = [];
let lasers = []; // Array to hold laser projectiles
let walls = []; // Array to hold moving walls

// Projectile Variables
let baseProjectileSpawnInterval = 1250; // Base interval in milliseconds
let projectileSpawnInterval = baseProjectileSpawnInterval;
let lastProjectileSpawn = Date.now();
let lastVerticalProjectileSpawn = Date.now();
let verticalProjectileSpawnInterval = 2000; // Interval between vertical projectiles

// Laser Variables
let lastLaserSpawn = Date.now();
let laserSpawnInterval = 15000; // Start spawning lasers after 15 seconds
let lastVerticalLaserSpawn = Date.now();
let verticalLaserSpawnInterval = 20000; // Interval between vertical lasers
let laserChargeTime = 5000; // Laser charges up for 5 seconds
let baseLaserWidthPercentage = 0.1; // Initial laser width is 10% of canvas size
let laserSpeed = 5; // Initial laser speed
let maxLaserHeightPercentage = 0.2; // Maximum laser width is 20% of canvas size

// Wall Variables
let lastWallSpawn = Date.now();
let wallSpawnInterval = 10000; // Start spawning walls after 10 seconds
let wallSpeed = 1; // Initial wall speed

let ground = {
    x: 0,
    y: canvas.height - 60,
    width: canvas.width,
    height: 60,
    color: '#486989', // Custom ground color
    isGround: true
};

let survivalStartTime = Date.now();
let survivalTime = 0;
let projectileSpeedIncrement = 0;

// Flow Variables
let flowAvailable = 0; // Total flow available to the player
let flowActive = false; // Is flow currently active
let flowMultiplier = 1; // Multiplier for slowing down during flow
let lastFlowIncrement = Date.now(); // Last time flow was incremented
let lastFlowDecrement = Date.now(); // Last time flow was decremented

// Flow Text Variables
let flowText = {
    active: false,
    startTime: 0,
    duration: 1000, // Duration to display "FLOW" text in milliseconds
    maxScale: 1.5, // Maximum scale for expansion effect
    currentScale: 1 // Current scale factor
};

// Game State
let gameState = 'playing'; // 'playing' or 'gameover'

// Create Platforms
function createPlatforms() {
    platforms = []; // Clear existing platforms
    let platformCount = 10; // Number of platforms
    let spacing = (canvas.height - ground.height - 100) / platformCount;

    for (let i = 0; i < platformCount; i++) {
        let type = 'static'; // Default platform type
        let color = '#9182c4'; // Your custom platform color

        // Introduce platform variation
        if (Math.random() < 0.2) {
            type = 'moving';
            color = '#a1c48d'; // Color for moving platforms
        } else if (Math.random() < 0.1) {
            type = 'disappearing';
            color = '#c49f8d'; // Color for disappearing platforms
        }

        let platform = {
            x: Math.random() * (canvas.width - 150) + 50,
            y: i * spacing + 50, // Adjusted to spread platforms more evenly
            width: 120, // Reduced width for more challenge
            height: 20,
            color: color,
            type: type,
            originalY: i * spacing + 50, // For moving platforms
            direction: 1, // For moving platforms
            speed: 1 // For moving platforms
        };
        platforms.push(platform);
    }
}

// Create a Single Horizontal Projectile
function createProjectile() {
    // Randomize projectile properties
    let size = Math.random() * 20 + 20; // Size between 20 and 40
    let speed = Math.random() * 2 + 2 + projectileSpeedIncrement; // Increase speed over time
    let startX = Math.random() < 0.5 ? -size : canvas.width; // Start from left or right edge
    let direction = startX === -size ? 1 : -1; // Move right if starting from left, and vice versa

    let projectile = {
        x: startX,
        y: Math.random() * (canvas.height - size - ground.height - 50) + 50,
        width: size,
        height: size,
        color: '#ff4040', // Single color for all projectiles
        speedX: speed * direction,
        speedY: 0,
        shape: 'circle' // All projectiles are circles
    };
    projectiles.push(projectile);
}

// Create a Single Vertical Projectile
function createVerticalProjectile() {
    // Randomize projectile properties
    let size = Math.random() * 20 + 20; // Size between 20 and 40
    let speed = Math.random() * 2 + 2 + projectileSpeedIncrement; // Increase speed over time
    let startY = Math.random() < 0.5 ? -size : canvas.height; // Start from top or bottom edge
    let direction = startY === -size ? 1 : -1; // Move down if starting from top, up if from bottom

    let projectile = {
        x: Math.random() * (canvas.width - size),
        y: startY,
        width: size,
        height: size,
        color: '#ff4040', // Same color as other projectiles
        speedX: 0,
        speedY: speed * direction,
        shape: 'circle' // All projectiles are circles
    };
    projectiles.push(projectile);
}

// Create a Laser Projectile (Horizontal)
function createLaser() {
    // Calculate laser height (since it covers horizontally)
    let laserHeightPercentage = baseLaserWidthPercentage + survivalTime * 0.0025; // Increase laser height over time
    if (laserHeightPercentage > maxLaserHeightPercentage) laserHeightPercentage = maxLaserHeightPercentage; // Cap at 20% of canvas height

    let laserHeight = canvas.height * laserHeightPercentage;
    let laserY = Math.random() * (canvas.height - laserHeight - ground.height - 50) + 50;

    let laser = {
        x: 0,
        y: laserY,
        width: canvas.width,
        height: laserHeight,
        color: 'rgba(255, 0, 0, 0.3)', // Red color with 30% opacity
        charging: true,
        chargeStartTime: Date.now(),
        firedAt: null, // Time when laser fired
        vertical: false // Horizontal laser
    };
    lasers.push(laser);
}

// Create a Vertical Laser
function createVerticalLaser() {
    // Calculate laser width (since it covers vertically)
    let laserWidthPercentage = baseLaserWidthPercentage + survivalTime * 0.0025; // Increase laser width over time
    if (laserWidthPercentage > maxLaserHeightPercentage) laserWidthPercentage = maxLaserHeightPercentage; // Cap at 20% of canvas width

    let laserWidth = canvas.width * laserWidthPercentage;
    let laserX = Math.random() * (canvas.width - laserWidth);

    let laser = {
        x: laserX,
        y: 0,
        width: laserWidth,
        height: canvas.height,
        color: 'rgba(255, 0, 0, 0.3)', // Red color with 30% opacity
        charging: true,
        chargeStartTime: Date.now(),
        firedAt: null, // Time when laser fired
        vertical: true // Vertical laser
    };
    lasers.push(laser);
}

// Create a Moving Wall with Holes
function createMovingWall() {
    // Determine if the wall is horizontal or vertical
    let isVertical = Math.random() < 0.5;

    let holeCount;

    // Determine the number of holes based on wall orientation
    if (isVertical) {
        holeCount = Math.floor(Math.random() * 3) + 3; // 3 to 5 holes for vertical walls
    } else {
        holeCount = Math.floor(Math.random() * 3) + 1; // 1 to 3 holes for horizontal walls
    }

    let holes = [];

    // Hole size (3 times the player's size)
    let holeSize = player.width * 3; // 40 * 3 = 120 pixels

    if (isVertical) {
        // Vertical wall moving left to right
        let wallWidth = 50; // Width of the wall
        let startX = -wallWidth;
        let speed = wallSpeed + survivalTime * 0.02; // Increase speed over time

        // Position holes
        for (let i = 0; i < holeCount; i++) {
            let availableHeight = canvas.height - ground.height - 50; // Exclude ground and top margin
            let holeY = Math.random() * availableHeight + 25;
            holes.push({
                x: startX,
                y: holeY - holeSize / 2,
                width: wallWidth,
                height: holeSize
            });
        }

        let wall = {
            x: startX,
            y: 0,
            width: wallWidth,
            height: canvas.height,
            speedX: speed,
            speedY: 0,
            color: 'red', // Red color for wall
            holes: holes,
            isVertical: true
        };
        walls.push(wall);
    } else {
        // Horizontal wall moving top to bottom
        let wallHeight = 50; // Height of the wall
        let startY = -wallHeight;
        let speed = wallSpeed + survivalTime * 0.03; // Increase speed over time

        // Position holes
        for (let i = 0; i < holeCount; i++) {
            let availableWidth = canvas.width - 50; // Exclude margins
            let holeX = Math.random() * availableWidth + 25;
            holes.push({
                x: holeX - holeSize / 2,
                y: startY,
                width: holeSize,
                height: wallHeight
            });
        }

        let wall = {
            x: 0,
            y: startY,
            width: canvas.width,
            height: wallHeight,
            speedX: 0,
            speedY: speed,
            color: 'red', // Red color for wall
            holes: holes,
            isVertical: false
        };
        walls.push(wall);
    }
}

// Handle Input
document.addEventListener('keydown', function(e) {
    // Prevent default actions for specific keys
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'KeyC'].includes(e.code)) {
        e.preventDefault();
    }

    if (!keys[e.code]) {
        keys[e.code] = true;

        // Restarting the game
        if (e.code === 'KeyR') {
            resetGame();
            return; // Exit early to prevent other actions
        }

        // Jumping
        if (gameState === 'playing' && !player.isTeleporting && (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') && player.jumpCount < 2) {
            player.velY = -player.jumpStrength;
            player.onGround = false;
            player.jumpCount++;
        }

        // Activate/Deactivate Flow
        if (gameState === 'playing' && e.code === 'KeyC') {
            toggleFlow();
        }
    }
});

document.addEventListener('keyup', function(e) {
    keys[e.code] = false;
});

// Toggle Flow Function
function toggleFlow() {
    if (!flowActive && flowAvailable > 4) {
        flowAvailable = flowAvailable - 4;
        // Activate Flow
        flowActive = true;
        flowMultiplier = 0.2; // Slow down projectiles and platforms
        applyScreenInversion();
        lastFlowDecrement = Date.now(); // Reset flow consumption timer

        // Activate FLOW Text Effect
        activateFlowText();
    } else if (flowActive) {
        // Deactivate Flow
        flowActive = false;
        flowMultiplier = 1; // Restore normal speed
        removeScreenInversion();
    }
}

// Apply Screen Inversion
function applyScreenInversion() {
    canvas.style.filter = 'invert(1)';
}

// Remove Screen Inversion
function removeScreenInversion() {
    canvas.style.filter = 'none';
}

// Activate FLOW Text Effect
function activateFlowText() {
    flowText.active = true;
    flowText.startTime = Date.now();
    flowText.currentScale = 1;
}

// Update FLOW Text Effect
function updateFlowText() {
    if (flowText.active) {
        let elapsed = Date.now() - flowText.startTime;

        if (elapsed < flowText.duration) {
            // Calculate scale factor (from 1 to maxScale)
            let progress = elapsed / flowText.duration;
            flowText.currentScale = 1 + (flowText.maxScale - 1) * progress;
        } else {
            // End FLOW text effect
            flowText.active = false;
        }
    }
}

// Resize Canvas on Window Resize
window.addEventListener('resize', function() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ground.width = canvas.width;
    ground.y = canvas.height - ground.height;

    // Optionally regenerate platforms to fit new size
    createPlatforms();
});

// Game Loop
function gameLoop() {
    requestAnimationFrame(gameLoop);

    if (gameState === 'playing') {
        // Update platforms first
        updatePlatforms();

        // Handle Input
        if (keys['ArrowLeft'] || keys['KeyA']) {
            if (player.velX > -player.speed) {
                player.velX -= 0.5;
            }
        }
        if (keys['ArrowRight'] || keys['KeyD']) {
            if (player.velX < player.speed) {
                player.velX += 0.5;
            }
        }

        // Apply Physics
        player.velY += gravity;
        player.velX *= friction;

        // Limit maximum velocities
        const maxSpeed = 10;
        if (player.velY > maxSpeed) player.velY = maxSpeed;
        if (player.velY < -maxSpeed) player.velY = -maxSpeed;
        if (player.velX > maxSpeed) player.velX = maxSpeed;
        if (player.velX < -maxSpeed) player.velX = -maxSpeed;

        // Reset onGround flag
        player.onGround = false;

        // Movement and Collision Detection
        movePlayer();

        // Update survival time
        survivalTime = Math.floor((Date.now() - survivalStartTime) / 1000);

        // Flow Accumulation
        if (Date.now() - lastFlowIncrement >= 1000) {
            flowAvailable += 1;
            lastFlowIncrement = Date.now();
        }

        // Flow Consumption
        if (flowActive && Date.now() - lastFlowDecrement >= 1000) {
            flowAvailable -= 4; // Consumes 4 flow points per second
            lastFlowDecrement = Date.now();

            if (flowAvailable <= 0) {
                flowAvailable = 0;
                toggleFlow(); // Deactivate flow when it runs out
            }
        }

        // Update FLOW Text Effect
        updateFlowText();

        // Difficulty scaling
        updateDifficulty();

        // Spawn new horizontal projectiles at intervals
        if (Date.now() - lastProjectileSpawn > projectileSpawnInterval) {
            createProjectile();
            lastProjectileSpawn = Date.now();
        }

        // Spawn vertical projectiles after 25 seconds
        if (survivalTime >= 25 && Date.now() - lastVerticalProjectileSpawn > verticalProjectileSpawnInterval) {
            createVerticalProjectile();
            lastVerticalProjectileSpawn = Date.now();
        }

        // Spawn horizontal lasers after 15 seconds
        if (survivalTime >= 15 && Date.now() - lastLaserSpawn > laserSpawnInterval) {
            createLaser();
            lastLaserSpawn = Date.now();
        }

        // Spawn vertical lasers after 35 seconds
        if (survivalTime >= 35 && Date.now() - lastVerticalLaserSpawn > verticalLaserSpawnInterval) {
            createVerticalLaser();
            lastVerticalLaserSpawn = Date.now();
        }

        // Spawn moving walls after 10 seconds
        if (survivalTime >= 10 && Date.now() - lastWallSpawn > wallSpawnInterval) {
            createMovingWall();
            lastWallSpawn = Date.now();
        }

        // Update projectiles
        updateProjectiles();

        // Update lasers
        updateLasers();

        // Update walls
        updateWalls();

        // Collision detection between player and projectiles
        checkProjectileCollisions();

        // Collision detection with lasers
        checkLaserCollisions();

        // Collision detection with walls
        checkWallCollisions();
    }

    // Clear Canvas and Draw Everything
    renderGame();
}

function movePlayer() {
    // Handle horizontal movement
    let nextX = player.x + player.velX;
    let playerBoxX = {
        x: nextX,
        y: player.y,
        width: player.width,
        height: player.height
    };

    let obstacles = [...platforms, ground];

    // Process horizontal collisions
    for (let obstacle of obstacles) {
        if (rectIntersect(playerBoxX, obstacle)) {
            let overlap = getOverlap(playerBoxX, obstacle, 'x');
            if (overlap !== 0) {
                // Resolve collision on X axis
                if (player.velX > 0) {
                    // Moving right; place player to the left of obstacle
                    nextX = obstacle.x - player.width - 1; // Subtract 1 pixel buffer
                } else if (player.velX < 0) {
                    // Moving left; place player to the right of obstacle
                    nextX = obstacle.x + obstacle.width + 1; // Add 1 pixel buffer
                }
                player.velX = 0;
            }
        }
    }

    player.isTeleporting = true; // Prevent jumps during collision resolution
    player.x = nextX;

    // Prevent player from going off-screen horizontally
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    // Handle vertical movement
    let nextY = player.y + player.velY;
    let playerBoxY = {
        x: player.x,
        y: nextY,
        width: player.width,
        height: player.height
    };

    for (let obstacle of obstacles) {
        if (rectIntersect(playerBoxY, obstacle)) {
            let overlap = getOverlap(playerBoxY, obstacle, 'y');
            if (overlap !== 0) {
                // Resolve collision on Y axis
                if (player.velY > 0) {
                    // Falling down; place player on top of obstacle
                    nextY = obstacle.y - player.height - 1; // Subtract 1 pixel buffer
                    player.onGround = true;
                    player.jumpCount = 0;

                    // Remove the platform if it's disappearing
                    if (obstacle.type === 'disappearing') {
                        platforms = platforms.filter(p => p !== obstacle);
                    }
                } else if (player.velY < 0) {
                    // Moving up; place player below the obstacle
                    nextY = obstacle.y + obstacle.height + 1; // Add 1 pixel buffer
                }
                player.velY = 0;
            }
        }
    }

    player.y = nextY;

    // Prevent player from going off-screen vertically
    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;

    player.isTeleporting = false; // Collision resolution complete
}

function getOverlap(playerBox, obstacle, axis) {
    if (axis === 'x') {
        if (playerBox.x < obstacle.x + obstacle.width && playerBox.x + playerBox.width > obstacle.x) {
            if (player.velX > 0) {
                // Moving right
                return (playerBox.x + playerBox.width) - obstacle.x;
            } else if (player.velX < 0) {
                // Moving left
                return (obstacle.x + obstacle.width) - playerBox.x;
            }
        }
    } else if (axis === 'y') {
        if (playerBox.y < obstacle.y + obstacle.height && playerBox.y + playerBox.height > obstacle.y) {
            if (player.velY > 0) {
                // Falling down
                return (playerBox.y + playerBox.height) - obstacle.y;
            } else if (player.velY < 0) {
                // Moving up
                return (obstacle.y + obstacle.height) - playerBox.y;
            }
        }
    }
    return 0;
}

function updatePlatforms() {
    for (let platform of platforms) {
        if (platform.type === 'moving') {
            platform.x += platform.speed * platform.direction * flowMultiplier;
            // Reverse direction at screen edges
            if (platform.x <= 0 || platform.x + platform.width >= canvas.width) {
                platform.direction *= -1;
            }
        }
        // Additional platform types (e.g., disappearing) can be handled here if needed
    }
}

function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let proj = projectiles[i];
        proj.x += proj.speedX * flowMultiplier;
        proj.y += proj.speedY * flowMultiplier;

        // Remove projectile if it's off-screen
        if (
            proj.x < -proj.width ||
            proj.x > canvas.width + proj.width ||
            proj.y < -proj.height ||
            proj.y > canvas.height + proj.height
        ) {
            projectiles.splice(i, 1);
        }
    }
}

function updateLasers() {
    for (let i = lasers.length - 1; i >= 0; i--) {
        let laser = lasers[i];

        if (laser.charging) {
            // Check if charge time is over
            if (Date.now() - laser.chargeStartTime >= laserChargeTime) {
                laser.charging = false;
                laser.color = 'red'; // Change color to indicate firing
                laser.firedAt = Date.now(); // Record the time when the laser fired
            }
        } else {
            // Laser is active after firing
            // Remove laser after a certain duration
            let laserActiveDuration = 2000; // Laser stays active for 2 seconds
            if (Date.now() - laser.firedAt >= laserActiveDuration) {
                lasers.splice(i, 1); // Remove laser
            }
            // Lasers remain stationary after firing
        }
    }
}

function updateWalls() {
    for (let i = walls.length - 1; i >= 0; i--) {
        let wall = walls[i];

        wall.x += wall.speedX * flowMultiplier;
        wall.y += wall.speedY * flowMultiplier;

        // Update holes position
        for (let hole of wall.holes) {
            hole.x += wall.speedX * flowMultiplier;
            hole.y += wall.speedY * flowMultiplier;
        }

        // Remove wall if it goes off-screen
        if (
            wall.x > canvas.width + wall.width ||
            wall.x < -wall.width * 2 ||
            wall.y > canvas.height + wall.height ||
            wall.y < -wall.height * 2
        ) {
            walls.splice(i, 1);
        }
    }
}

function checkProjectileCollisions() {
    for (let proj of projectiles) {
        if (rectIntersect(player, proj)) {
            // Player has been hit by a projectile
            gameOver();
            break;
        }
    }
}

function checkLaserCollisions() {
    for (let laser of lasers) {
        if (!laser.charging && rectIntersect(player, laser)) {
            // Player has been hit by the laser
            gameOver();
            break;
        }
    }
}

function checkWallCollisions() {
    for (let wall of walls) {
        // Check collision with wall
        if (rectIntersect(player, wall)) {
            let collision = true;
            // Check if player is within any hole
            for (let hole of wall.holes) {
                if (rectIntersect(player, hole)) {
                    collision = false;
                    break;
                }
            }
            if (collision) {
                // Player has collided with wall
                gameOver();
                break;
            }
        }
    }
}

function gameOver() {
    gameState = 'gameover';
}

function rectIntersect(r1, r2) {
    return (
        r1.x < r2.x + r2.width &&
        r1.x + r1.width > r2.x &&
        r1.y < r2.y + r2.height &&
        r1.y + r1.height > r2.y
    );
}

// Collision Direction Check - No longer used in this revision
/*
function colCheck(shapeA, shapeB) {
    let dx = (shapeA.x + shapeA.width / 2) - (shapeB.x + shapeB.width / 2);
    let dy = (shapeA.y + shapeA.height / 2) - (shapeB.y + shapeB.height / 2);
    let width = (shapeA.width + shapeB.width) / 2;
    let height = (shapeA.height + shapeB.height) / 2;
    let crossWidth = width * dy;
    let crossHeight = height * dx;
    let collision = null;

    if (Math.abs(dx) <= width && Math.abs(dy) <= height) {
        if (crossWidth > crossHeight) {
            collision = (crossWidth > (-crossHeight)) ? 'b' : 'l';
        } else {
            collision = (crossWidth > (-crossHeight)) ? 'r' : 't';
        }
    }
    return collision;
}
*/

function updateDifficulty() {
    // Decrease the spawn interval over time to increase difficulty
    projectileSpawnInterval = baseProjectileSpawnInterval - survivalTime * 50;
    if (projectileSpawnInterval < 500) projectileSpawnInterval = 500; // Set a minimum spawn interval

    // Increase projectile speed over time
    projectileSpeedIncrement = survivalTime * 0.1;

    // Increase laser difficulty
    laserSpawnInterval = 15000 - survivalTime * 500;
    if (laserSpawnInterval < 5000) laserSpawnInterval = 5000; // Minimum interval between lasers

    verticalLaserSpawnInterval = 20000 - (survivalTime - 35) * 500;
    if (verticalLaserSpawnInterval < 5000) verticalLaserSpawnInterval = 5000; // Minimum interval between vertical lasers

    laserSpeed = 5 + survivalTime * 0.1;
    if (laserSpeed > 15) laserSpeed = 15; // Cap laser speed

    // Increase wall speed over time
    wallSpeed = 1 + survivalTime * 0.025;
    if (wallSpeed > 10) wallSpeed = 10; // Cap wall speed
}

// Render Function
function renderGame() {
    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background Gradient
    let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#ffffff'); // Your custom background colors
    gradient.addColorStop(1, '#ebd9dd');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Platforms
    for (let platform of platforms) {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    }

    // Draw Ground
    ctx.fillStyle = ground.color;
    ctx.fillRect(ground.x, ground.y, ground.width, ground.height);

    // Draw Projectiles
    for (let proj of projectiles) {
        ctx.fillStyle = proj.color;
        ctx.beginPath();
        ctx.arc(proj.x + proj.width / 2, proj.y + proj.height / 2, proj.width / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw Lasers
    for (let laser of lasers) {
        ctx.fillStyle = laser.color;
        ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
    }

    // Draw Walls
    for (let wall of walls) {
        ctx.fillStyle = wall.color;
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);

        // Draw holes (erase parts of the wall)
        for (let hole of wall.holes) {
            ctx.clearRect(hole.x, hole.y, hole.width, hole.height);
        }
    }

    // Draw Player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Draw Survival Time
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText('Survival Time: ' + survivalTime + 's', 10, 30);

    // Draw Flow Available
    ctx.fillStyle = 'blue';
    ctx.font = '20px Arial';
    ctx.fillText('FLOW: ' + flowAvailable, 10, 60);

    // Draw Instruction Texts in Top Right
    ctx.fillStyle = 'black';
    ctx.font = '18px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('Double Tap Spacebar to Double Jump', canvas.width - 10, 30);
    ctx.fillText('Press C for FLOW', canvas.width - 10, 55);
    ctx.textAlign = 'left'; // Reset text alignment to default

    // Draw FLOW Text Effect if Active
    if (flowText.active) {
        ctx.save(); // Save current state
        ctx.font = 'bold 50px Arial';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(flowText.currentScale, flowText.currentScale);
        ctx.fillText('FLOW', 0, 0);
        ctx.restore(); // Restore to original state
    }

    // If game over, draw game over screen
    if (gameState === 'gameover') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'white';
        ctx.font = '50px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 50);
        ctx.font = '30px Arial';
        ctx.fillText('You survived for ' + survivalTime + ' seconds', canvas.width / 2, canvas.height / 2);
        ctx.fillText('Press R to Retry', canvas.width / 2, canvas.height / 2 + 50);
        ctx.textAlign = 'left';
    }
}

// Reset Game Function
function resetGame() {
    gameState = 'playing';

    // Reset player state
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - 80;
    player.velX = 0;
    player.velY = 0;
    player.onGround = false;
    player.jumpCount = 0;
    player.isTeleporting = false;

    // Reset projectiles and lasers
    projectiles = [];
    lasers = [];
    walls = [];
    lastProjectileSpawn = Date.now();
    lastLaserSpawn = Date.now();
    lastVerticalProjectileSpawn = Date.now();
    lastVerticalLaserSpawn = Date.now();
    lastWallSpawn = Date.now();
    projectileSpawnInterval = baseProjectileSpawnInterval;
    projectileSpeedIncrement = 0;

    // Reset survival time and flow
    survivalStartTime = Date.now();
    survivalTime = 0;
    flowAvailable = 0;
    flowActive = false;
    flowMultiplier = 1;
    lastFlowIncrement = Date.now();
    lastFlowDecrement = Date.now();

    // Reset FLOW Text Effect
    flowText.active = false;
    flowText.currentScale = 1;

    // Remove screen inversion if active
    removeScreenInversion();

    // Regenerate platforms
    createPlatforms();
}

// Initialize Game
createPlatforms();
gameLoop();
