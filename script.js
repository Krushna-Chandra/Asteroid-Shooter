        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const gameContainer = document.getElementById('game-container');
        const homeScreen = document.getElementById('home-screen');
        const playButton = document.getElementById('play-button');
        const levelSelectionScreen = document.getElementById('level-selection-screen');
        const gameOverScreen = document.getElementById('game-over-screen');
        const restartButton = document.getElementById('restart-button');
        const scoreEl = document.getElementById('score');
        const livesEl = document.getElementById('lives');
        const levelButtons = document.querySelectorAll('#level-selection-screen .level-button');

        // Touch controls
        const touchControls = document.getElementById('touch-controls');
        const moveLeftButton = document.getElementById('move-left');
        const moveRightButton = document.getElementById('move-right');
        const shootButton = document.getElementById('shoot-button');
        let shootInterval = null;


        let isGameOver = false;
        let animationFrameId;
        
        // --- Game Settings ---
        let gameSettings;
        const difficulties = {
            easy: { baseSpeed: 1, speedRange: 1, spawnInterval: 65, scoreMultiplier: 0.2 },
            medium: { baseSpeed: 1.5, speedRange: 1.5, spawnInterval: 50, scoreMultiplier: 0.25 },
            hard: { baseSpeed: 2, speedRange: 2, spawnInterval: 35, scoreMultiplier: 0.3 }
        };

        function setCanvasSize() {
            const aspectRatio = 4 / 3;
            let newWidth = window.innerWidth;
            let newHeight = window.innerHeight;

            if (newHeight < newWidth / aspectRatio) {
                newWidth = newHeight * aspectRatio;
            } else {
                newHeight = newWidth / aspectRatio;
            }

            gameContainer.style.width = `${newWidth}px`;
            gameContainer.style.height = `${newHeight}px`;
            canvas.width = newWidth;
            canvas.height = newHeight;
        }

        // --- Game Classes ---

        class Player {
            constructor() {
                this.width = 40;
                this.height = 40;
                this.x = (canvas.width - this.width) / 2;
                this.y = canvas.height - this.height - 20;
                this.speed = 7;
                this.lives = 3;
                this.invincible = false;
                this.invincibilityFrames = 0;
                this.maxInvincibilityFrames = 120; // 2 seconds
                this.shootCooldown = 0;
                this.rapidFireActive = false;
                this.rapidFireTimer = 0;
            }

            draw() {
                // Main ship body
                ctx.beginPath();
                ctx.moveTo(this.x + this.width / 2, this.y);
                ctx.lineTo(this.x, this.y + this.height);
                ctx.lineTo(this.x + this.width, this.y + this.height);
                ctx.closePath();

                if (this.invincible) {
                     // Flicker effect when invincible
                    ctx.strokeStyle = `rgba(0, 255, 0, ${Math.abs(Math.sin(Date.now() / 100))})`;
                    ctx.fillStyle = `rgba(0, 50, 0, ${Math.abs(Math.sin(Date.now() / 100))})`;
                } else {
                    ctx.strokeStyle = '#0f0';
                    ctx.fillStyle = '#010';
                }
                
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fill();

                 // Cockpit
                ctx.beginPath();
                ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 5, 0, Math.PI * 2);
                ctx.fillStyle = this.rapidFireActive ? '#0ff' : '#0f0'; // Change cockpit color for rapid fire
                ctx.fill();
            }

            update() {
                if (keys['ArrowLeft'] && this.x > 0) {
                    this.x -= this.speed;
                }
                if (keys['ArrowRight'] && this.x < canvas.width - this.width) {
                    this.x += this.speed;
                }
                if (this.invincible) {
                    this.invincibilityFrames++;
                    if (this.invincibilityFrames > this.maxInvincibilityFrames) {
                        this.invincible = false;
                        this.invincibilityFrames = 0;
                    }
                }

                // Handle shooting cooldown
                if (this.shootCooldown > 0) {
                    this.shootCooldown--;
                }

                // Handle rapid fire timer
                if (this.rapidFireActive) {
                    this.rapidFireTimer--;
                    if (this.rapidFireTimer <= 0) {
                        this.rapidFireActive = false;
                    }
                }

                this.draw();
            }
            
            loseLife() {
                if (!this.invincible) {
                    this.lives--;
                    this.invincible = true;
                    if (this.lives <= 0) {
                        gameOver();
                    }
                }
            }

            shoot() {
                if (this.shootCooldown === 0) {
                    bullets.push(new Bullet(this.x + this.width / 2 - 2, this.y));
                    this.shootCooldown = this.rapidFireActive ? 8 : 20; // Faster cooldown for rapid fire
                }
            }
            
            activateRapidFire() {
                this.rapidFireActive = true;
                this.rapidFireTimer = 600; // 10 seconds at 60fps
            }
        }

        class Bullet {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.width = 4;
                this.height = 12;
                this.speed = 10;
            }

            draw() {
                ctx.fillStyle = '#ff0';
                ctx.shadowColor = '#ff0';
                ctx.shadowBlur = 10;
                ctx.fillRect(this.x, this.y, this.width, this.height);
                ctx.shadowBlur = 0; // Reset shadow blur
            }

            update() {
                this.y -= this.speed;
                this.draw();
            }
        }

        class Asteroid {
            constructor() {
                this.size = Math.random() * 40 + 20; // Size between 20 and 60
                this.x = Math.random() * (canvas.width - this.size);
                this.y = -this.size;
                
                // Speed increases with score
                const scoreBonus = Math.floor(score / 200) * gameSettings.scoreMultiplier;
                this.speed = (Math.random() * gameSettings.speedRange + gameSettings.baseSpeed) + scoreBonus;
                
                this.rotation = 0;
                this.rotationSpeed = (Math.random() - 0.5) * 0.05;
                
                // Create a jagged shape
                this.shape = [];
                const points = 8 + Math.floor(Math.random() * 5);
                for (let i = 0; i < points; i++) {
                    const angle = (i / points) * Math.PI * 2;
                    const radius = this.size / 2 * (0.8 + Math.random() * 0.4);
                    this.shape.push({x: Math.cos(angle) * radius, y: Math.sin(angle) * radius});
                }
            }

            draw() {
                ctx.save();
                ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
                ctx.rotate(this.rotation);
                ctx.beginPath();
                ctx.moveTo(this.shape[0].x, this.shape[0].y);
                for(let i = 1; i < this.shape.length; i++) {
                    ctx.lineTo(this.shape[i].x, this.shape[i].y);
                }
                ctx.closePath();
                ctx.strokeStyle = '#0f0';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.restore();
            }

            update() {
                this.y += this.speed;
                this.rotation += this.rotationSpeed;
                this.draw();
            }
        }

        class PowerUp {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.size = 15;
                this.speedY = 1.5;
                this.type = 'rapidFire'; 
            }

            draw() {
                // Draw a glowing circle
                ctx.save();
                ctx.shadowColor = '#0ff';
                ctx.shadowBlur = 20;
                ctx.fillStyle = '#0ff';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw the letter 'R' for Rapid Fire
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#000';
                ctx.font = '16px "Press Start 2P"';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('R', this.x, this.y);
                ctx.restore();
            }

            update() {
                this.y += this.speedY;
                this.draw();
            }
        }
        
        class Particle {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.size = Math.random() * 3 + 1;
                this.speedX = (Math.random() - 0.5) * 4;
                this.speedY = (Math.random() - 0.5) * 4;
                this.life = 100; // 100 frames
            }

            draw() {
                ctx.fillStyle = `rgba(0, 255, 0, ${this.life / 100})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }

            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                this.life -= 2;
                this.draw();
            }
        }


        // --- Game State ---
        let player, keys, bullets, asteroids, particles, score, powerUps;
        let asteroidSpawnTimer = 0;
        let nextPowerUpScore = 0;

        function startGame(difficulty) {
            gameSettings = difficulties[difficulty];
            levelSelectionScreen.style.display = 'none';
            gameOverScreen.style.display = 'none';
            gameContainer.style.display = 'block';
            init();
        }

        function init() {
            setCanvasSize();
            isGameOver = false;
            
            player = new Player();
            keys = {};
            bullets = [];
            asteroids = [];
            particles = [];
            powerUps = [];
            score = 0;
            nextPowerUpScore = 750; // First power-up at 750 points

            updateUI();
            
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            gameLoop();
        }


        // --- Game Loop ---
        function gameLoop() {
            if (isGameOver) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Dynamically adjust asteroid spawn rate based on score
            const currentSpawnInterval = Math.max(15, gameSettings.spawnInterval - Math.floor(score / 500) * 5);

            // Handle spawning asteroids
            asteroidSpawnTimer++;
            if (asteroidSpawnTimer > currentSpawnInterval) {
                asteroids.push(new Asteroid());
                asteroidSpawnTimer = 0;
            }

            // Update player
            player.update();
            updateUI();

            // Update bullets
            for (let i = bullets.length - 1; i >= 0; i--) {
                bullets[i].update();
                if (bullets[i].y < 0) {
                    bullets.splice(i, 1);
                }
            }

            // Update powerups
            for (let i = powerUps.length - 1; i >= 0; i--) {
                powerUps[i].update();
                if (powerUps[i].y > canvas.height) {
                    powerUps.splice(i, 1);
                }
            }

            // Update asteroids
            for (let i = asteroids.length - 1; i >= 0; i--) {
                asteroids[i].update();
                if (asteroids[i].y > canvas.height) {
                    asteroids.splice(i, 1);
                }
            }
            
             // Update particles
            for (let i = particles.length - 1; i >= 0; i--) {
                particles[i].update();
                if (particles[i].life <= 0) {
                    particles.splice(i, 1);
                }
            }

            handleCollisions();

            animationFrameId = requestAnimationFrame(gameLoop);
        }

        // --- Collision Detection ---
        function handleCollisions() {
            // Bullet-Asteroid collision
            for (let i = asteroids.length - 1; i >= 0; i--) {
                for (let j = bullets.length - 1; j >= 0; j--) {
                    if (
                        bullets[j].x < asteroids[i].x + asteroids[i].size &&
                        bullets[j].x + bullets[j].width > asteroids[i].x &&
                        bullets[j].y < asteroids[i].y + asteroids[i].size &&
                        bullets[j].y + bullets[j].height > asteroids[i].y
                    ) {
                        // Create explosion
                        for(let k = 0; k < asteroids[i].size / 2; k++) {
                           particles.push(new Particle(bullets[j].x, bullets[j].y));
                        }
                        
                        score += Math.floor(asteroids[i].size);

                        // Check if it's time to spawn a power-up
                        if (score >= nextPowerUpScore) {
                            powerUps.push(new PowerUp(Math.random() * (canvas.width - 40) + 20, -20));
                            nextPowerUpScore += 750 + (score / 10); // Next powerup takes a bit longer to get
                        }

                        updateUI();

                        asteroids.splice(i, 1);
                        bullets.splice(j, 1);
                        break; 
                    }
                }
            }

            // Player-Asteroid collision
            for (let i = asteroids.length - 1; i >= 0; i--) {
                if (!player.invincible &&
                    player.x < asteroids[i].x + asteroids[i].size &&
                    player.x + player.width > asteroids[i].x &&
                    player.y < asteroids[i].y + asteroids[i].size &&
                    player.y + player.height > asteroids[i].y
                ) {
                    player.loseLife();
                    updateUI();
                    
                    // Create explosion at player location
                    for(let k = 0; k < 30; k++) {
                       particles.push(new Particle(player.x + player.width / 2, player.y + player.height / 2));
                    }
                    
                    asteroids.splice(i, 1);
                    break;
                }
            }

            // Player-PowerUp collision
            for (let i = powerUps.length - 1; i >= 0; i--) {
                const pu = powerUps[i];
                if (
                    player.x < pu.x + pu.size &&
                    player.x + player.width > pu.x - pu.size &&
                    player.y < pu.y + pu.size &&
                    player.y + player.height > pu.y - pu.size
                ) {
                    if (pu.type === 'rapidFire') {
                        player.activateRapidFire();
                    }
                    powerUps.splice(i, 1);
                }
            }
        }
        
        function updateUI() {
            scoreEl.textContent = `SCORE: ${score}`;
            livesEl.innerHTML = `LIVES: ${'&#9650;'.repeat(player.lives)}`;
        }

        function gameOver() {
            isGameOver = true;
            if (shootInterval) clearInterval(shootInterval);
            gameContainer.style.display = 'none';
            gameOverScreen.style.display = 'flex';
            cancelAnimationFrame(animationFrameId);
        }

        // --- Event Listeners ---
        playButton.addEventListener('click', () => {
            homeScreen.style.display = 'none';
            levelSelectionScreen.style.display = 'flex';
        });

        levelButtons.forEach(button => {
            button.addEventListener('click', () => {
                startGame(button.dataset.difficulty);
            });
        });

        window.addEventListener('keydown', (e) => {
            if (isGameOver) return;
            keys[e.code] = true;
            if (e.code === 'Space') {
                e.preventDefault();
                player.shoot();
            }
        });

        window.addEventListener('keyup', (e) => {
            keys[e.code] = false;
        });
        
        restartButton.addEventListener('click', () => {
            gameOverScreen.style.display = 'none';
            homeScreen.style.display = 'flex';
        });

        window.addEventListener('resize', () => {
           setCanvasSize();
           if(player) {
              player.x = (canvas.width - player.width) / 2;
              player.y = canvas.height - player.height - 20;
           }
        });

        // --- Touch Control Setup ---
        function isTouchDevice() {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        }

        if (isTouchDevice()) {
            touchControls.style.display = 'block';

            moveLeftButton.addEventListener('touchstart', (e) => { e.preventDefault(); keys['ArrowLeft'] = true; });
            moveLeftButton.addEventListener('touchend', (e) => { e.preventDefault(); keys['ArrowLeft'] = false; });
            moveRightButton.addEventListener('touchstart', (e) => { e.preventDefault(); keys['ArrowRight'] = true; });
            moveRightButton.addEventListener('touchend', (e) => { e.preventDefault(); keys['ArrowRight'] = false; });
            
            shootButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (isGameOver || !player) return;
                player.shoot(); 
                if (shootInterval) clearInterval(shootInterval);
                shootInterval = setInterval(() => {
                    if (player) player.shoot();
                }, 150);
            });

            const endShoot = (e) => {
                e.preventDefault();
                clearInterval(shootInterval);
                shootInterval = null;
            };
            shootButton.addEventListener('touchend', endShoot);
            shootButton.addEventListener('touchcancel', endShoot);
        }

        // --- Initial Setup ---
        window.onload = function () {
            setCanvasSize();
        };