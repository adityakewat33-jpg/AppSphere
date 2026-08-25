class GameEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Match canvas dimensions to the CSS scaled element size
        this.width = 480;
        this.height = 720;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.gameState = 'START'; // START, PLAYING, PAUSED, GAMEOVER
        this.gameMode = 'classic'; // classic, hard, zen
        
        // Physics constants
        this.baseGravity = 0.45;
        this.baseJump = -7.5;
        this.baseSpeed = 3.0;
        
        // Dynamic game variables
        this.gravity = this.baseGravity;
        this.jumpStrength = this.baseJump;
        this.speed = this.baseSpeed;
        this.score = 0;
        this.highScore = 0;
        this.totalFlaps = 0;
        this.distanceTravelled = 0;
        this.tick = 0;

        // Game Entities
        this.bird = null;
        this.pipes = [];
        this.particles = [];
        
        // Skins data
        this.activeSkin = 'classic';
        this.skins = {
            classic: {
                name: 'Classic Yellow',
                desc: 'The standard flappy flyer.',
                color: '#facc15',
                trailColor: 'rgba(250, 204, 21, 0.4)',
                unlockScore: 0,
                unlocked: true,
                draw: (ctx, x, y, size, angle, tick) => this.drawClassicBird(ctx, x, y, size, angle, tick)
            },
            cyber: {
                name: 'Cyber Drone',
                desc: 'Stealth aero-glider with neon exhaust.',
                color: '#06b6d4',
                trailColor: 'rgba(6, 182, 212, 0.5)',
                unlockScore: 10,
                unlocked: false,
                draw: (ctx, x, y, size, angle, tick) => this.drawCyberBird(ctx, x, y, size, angle, tick)
            },
            golden: {
                name: 'Golden Crest',
                desc: 'Gilded mechanical eagle for high flyers.',
                color: '#fbbf24',
                trailColor: 'rgba(251, 191, 36, 0.6)',
                unlockScore: 30,
                unlocked: false,
                draw: (ctx, x, y, size, angle, tick) => this.drawGoldenBird(ctx, x, y, size, angle, tick)
            },
            phoenix: {
                name: 'Phoenix Flame',
                desc: 'Fiery mythical bird of rebirth.',
                color: '#f97316',
                trailColor: 'rgba(249, 115, 22, 0.6)',
                unlockScore: 50,
                unlocked: false,
                draw: (ctx, x, y, size, angle, tick) => this.drawPhoenixBird(ctx, x, y, size, angle, tick)
            }
        };

        // Starfield background data (static generation once)
        this.stars = [];
        this.generateStars();
        
        // City skyline data
        this.buildings = [];
        this.generateBuildings();

        // Timing helper
        this.lastTime = 0;
        
        // Set callbacks for UI notifications
        this.onGameOverCallback = null;
        this.onScoreCallback = null;
        this.onAchievementCallback = null;

        // Ground offset for scrolling
        this.groundY = this.height - 60;
        this.groundScroll = 0;
    }

    generateStars() {
        this.stars = [];
        for (let i = 0; i < 60; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * (this.groundY - 100),
                size: Math.random() * 1.5 + 0.5,
                brightness: Math.random(),
                pulseSpeed: 0.02 + Math.random() * 0.03
            });
        }
    }

    generateBuildings() {
        this.buildings = [];
        let curX = 0;
        while (curX < this.width + 150) {
            const bWidth = 60 + Math.random() * 60;
            const bHeight = 100 + Math.random() * 150;
            this.buildings.push({
                x: curX,
                width: bWidth,
                height: bHeight,
                windows: this.generateWindows(bWidth, bHeight),
                color: `hsl(${260 + Math.random() * 20}, 40%, ${10 + Math.random() * 5}%)`
            });
            curX += bWidth - 10; // Slight overlap
        }
    }

    generateWindows(w, h) {
        const windows = [];
        const rows = Math.floor(h / 20) - 2;
        const cols = Math.floor(w / 15) - 1;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (Math.random() > 0.4) {
                    windows.push({
                        dx: 8 + c * 15,
                        dy: 15 + r * 20,
                        glow: Math.random() > 0.3
                    });
                }
            }
        }
        return windows;
    }

    initGame() {
        this.score = 0;
        this.tick = 0;
        this.distanceTravelled = 0;
        this.pipes = [];
        this.particles = [];
        
        // Reset speed adjustments based on mode
        if (this.gameMode === 'hard') {
            this.speed = this.baseSpeed + 1.0;
            this.gravity = this.baseGravity + 0.05;
        } else if (this.gameMode === 'zen') {
            this.speed = this.baseSpeed;
            this.gravity = this.baseGravity - 0.05;
        } else {
            this.speed = this.baseSpeed;
            this.gravity = this.baseGravity;
        }

        // Initialize bird
        this.bird = {
            x: 100,
            y: this.height / 2,
            velocity: 0,
            radius: 17,
            angle: 0,
            flapCooldown: 0
        };
        
        this.lastTime = performance.now();
    }

    setMode(mode) {
        this.gameMode = mode;
        this.initGame();
    }

    setSkin(skinKey) {
        if (this.skins[skinKey]) {
            this.activeSkin = skinKey;
        }
    }

    start() {
        this.gameState = 'PLAYING';
        this.initGame();
        // Initial flap on start
        this.flap();
    }

    togglePause() {
        if (this.gameState === 'PLAYING') {
            this.gameState = 'PAUSED';
        } else if (this.gameState === 'PAUSED') {
            this.gameState = 'PLAYING';
            this.lastTime = performance.now();
        }
    }

    flap() {
        if (this.gameState !== 'PLAYING') return;
        
        this.bird.velocity = this.jumpStrength;
        this.totalFlaps++;
        
        // Emit feather or engine particles
        this.emitFlapParticles();
        
        if (window.AudioEngine) {
            window.AudioEngine.playFlap();
        }
    }

    // --- Core Loops ---
    tickLoop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        let dt = (timestamp - this.lastTime) / 16.666; // Normalized to 60fps = 1.0
        
        // Cap dt to prevent massive physics leaps in background tabs
        if (dt > 4.0) dt = 4.0;
        
        this.lastTime = timestamp;

        if (this.gameState === 'PLAYING') {
            this.update(dt);
        } else if (this.gameState === 'START' || this.gameState === 'GAMEOVER') {
            // Idle background scrolling
            this.tick++;
            this.distanceTravelled += (this.speed * 0.35) * dt;
            this.groundScroll = (this.groundScroll - (this.speed * 0.35) * dt) % 24;
            this.updateParticles(dt);
        }
        
        this.render();
    }

    update(dt) {
        this.tick++;
        this.distanceTravelled += this.speed * dt;

        // Background / Parallax updates
        this.groundScroll = (this.groundScroll - this.speed * dt) % 24;

        // Update bird physics
        this.bird.velocity += this.gravity * dt;
        // Cap terminal velocity
        if (this.bird.velocity > 12) this.bird.velocity = 12;
        this.bird.y += this.bird.velocity * dt;

        // Bird rotation based on velocity
        if (this.bird.velocity < 2) {
            // Rising or stable: tilt up gently
            this.bird.angle = Math.max(-0.4, this.bird.velocity * 0.08);
        } else {
            // Diving: tilt down fast
            this.bird.angle = Math.min(1.2, this.bird.angle + (this.bird.velocity - 2) * 0.04 * dt);
        }

        // Spawn Skin-based passive particles (trails)
        this.emitPassiveParticles();

        // Death bounds (ground collision)
        if (this.bird.y + this.bird.radius >= this.groundY) {
            this.bird.y = this.groundY - this.bird.radius;
            this.triggerGameOver('ground');
            return;
        }
        
        // Ceiling bounds: Push back down
        if (this.bird.y - this.bird.radius < 0) {
            this.bird.y = this.bird.radius;
            this.bird.velocity = 0.5;
        }

        // Update pipes (only if NOT in Zen Mode)
        if (this.gameMode !== 'zen') {
            this.updatePipes(dt);
        }

        // Update particles
        this.updateParticles(dt);
    }

    updatePipes(dt) {
        // Spawn pipes
        const pipeSpacing = 280; // Distance between horizontal pipes
        const rightmostPipeX = this.pipes.length > 0 ? this.pipes[this.pipes.length - 1].x : 0;
        
        if (this.pipes.length === 0 || rightmostPipeX < this.width - pipeSpacing) {
            this.spawnPipe();
        }

        // Update pipe positions
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const p = this.pipes[i];
            p.x -= this.speed * dt;

            // In Hard Mode, pipes move vertically
            if (this.gameMode === 'hard') {
                p.angle += 0.035 * dt;
                p.centerY = p.baseCenterY + Math.sin(p.angle) * p.amplitude;
            }

            // Check if bird has passed this pipe to earn a score point
            if (!p.passed && p.x + p.width / 2 < this.bird.x) {
                p.passed = true;
                this.score++;
                if (this.onScoreCallback) this.onScoreCallback(this.score);
                if (window.AudioEngine) {
                    window.AudioEngine.playScore();
                }
            }

            // Box collision check
            if (this.checkCollision(this.bird, p)) {
                this.triggerGameOver('pipe');
                return;
            }

            // Remove offscreen pipes
            if (p.x + p.width < -50) {
                this.pipes.splice(i, 1);
            }
        }
    }

    spawnPipe() {
        const minHeight = 80;
        const maxHeight = this.groundY - 240;
        const centerY = minHeight + Math.random() * maxHeight;
        const gap = this.gameMode === 'hard' ? 120 : 145; // Hard mode has narrower gaps

        this.pipes.push({
            x: this.width + 50,
            width: 72,
            centerY: centerY,
            baseCenterY: centerY,
            gap: gap,
            passed: false,
            // Hard Mode moving parameters
            angle: Math.random() * Math.PI,
            amplitude: 40 + Math.random() * 30
        });
    }

    checkCollision(bird, pipe) {
        // Broad phase bounding box check
        if (bird.x + bird.radius < pipe.x || bird.x - bird.radius > pipe.x + pipe.width) {
            return false;
        }

        const topPipeBottom = pipe.centerY - pipe.gap / 2;
        const bottomPipeTop = pipe.centerY + pipe.gap / 2;

        // Collision with top pipe
        if (bird.y - bird.radius < topPipeBottom) {
            // Check exact intersection
            const closestX = Math.max(pipe.x, Math.min(bird.x, pipe.x + pipe.width));
            const closestY = Math.min(bird.y, topPipeBottom);
            const dist = Math.hypot(bird.x - closestX, bird.y - closestY);
            if (dist < bird.radius - 2) return true; // 2px grace margin
        }

        // Collision with bottom pipe
        if (bird.y + bird.radius > bottomPipeTop) {
            // Check exact intersection
            const closestX = Math.max(pipe.x, Math.min(bird.x, pipe.x + pipe.width));
            const closestY = Math.max(bird.y, bottomPipeTop);
            const dist = Math.hypot(bird.x - closestX, bird.y - closestY);
            if (dist < bird.radius - 2) return true; // 2px grace margin
        }

        return false;
    }

    triggerGameOver(cause) {
        this.gameState = 'GAMEOVER';
        
        // Spawn massive explosion splash
        this.emitExplosionParticles();

        if (window.AudioEngine) {
            window.AudioEngine.playHit();
            if (cause === 'pipe') {
                // Delay playFall slightly so it overlays nicely
                setTimeout(() => {
                    if (this.gameState === 'GAMEOVER') window.AudioEngine.playFall();
                }, 150);
            }
        }

        // Check high scores
        if (this.score > this.highScore) {
            this.highScore = this.score;
        }

        if (this.onGameOverCallback) {
            this.onGameOverCallback(this.score, this.highScore);
        }
    }

    // --- Particle System ---
    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            
            // Add air resistance and gravity if needed
            p.vy += p.gravity * dt;
            p.vx *= Math.pow(p.friction, dt);
            p.vy *= Math.pow(p.friction, dt);

            p.angle += p.va * dt;
            p.life -= p.decay * dt;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    emitFlapParticles() {
        const skin = this.skins[this.activeSkin];
        const numParticles = this.activeSkin === 'phoenix' ? 12 : 6;
        
        for (let i = 0; i < numParticles; i++) {
            const angle = Math.PI + (Math.random() * 0.6 - 0.3) + this.bird.angle;
            const speed = 1.5 + Math.random() * 3.5;
            
            this.particles.push({
                x: this.bird.x - 10,
                y: this.bird.y,
                vx: Math.cos(angle) * speed - this.speed * 0.3,
                vy: Math.sin(angle) * speed + 1,
                gravity: -0.05, // floats upwards slightly
                friction: 0.98,
                color: skin.trailColor,
                size: 2 + Math.random() * 4,
                life: 1.0,
                decay: 0.03 + Math.random() * 0.04,
                angle: Math.random() * Math.PI * 2,
                va: (Math.random() - 0.5) * 0.2,
                type: this.activeSkin
            });
        }
    }

    emitPassiveParticles() {
        // Emit smaller continuous trails
        if (this.tick % 2 !== 0) return;
        
        const skin = this.skins[this.activeSkin];
        let pSize = 2 + Math.random() * 3;
        let decay = 0.04 + Math.random() * 0.04;
        let vy = (Math.random() - 0.5) * 0.8;
        
        if (this.activeSkin === 'phoenix') {
            pSize = 4 + Math.random() * 4;
            decay = 0.02 + Math.random() * 0.03;
            vy -= 1.0; // rises up like hot smoke
        }
        
        this.particles.push({
            x: this.bird.x - 15,
            y: this.bird.y + (Math.random() - 0.5) * 10,
            vx: -this.speed * 0.6 - Math.random() * 1.5,
            vy: vy,
            gravity: this.activeSkin === 'phoenix' ? -0.08 : 0,
            friction: 0.99,
            color: skin.trailColor,
            size: pSize,
            life: 1.0,
            decay: decay,
            angle: Math.random() * Math.PI * 2,
            va: (Math.random() - 0.5) * 0.1,
            type: this.activeSkin
        });
    }

    emitExplosionParticles() {
        const numParticles = 40;
        const skin = this.skins[this.activeSkin];
        
        for (let i = 0; i < numParticles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2.0 + Math.random() * 8.0;
            const size = 3.0 + Math.random() * 6.0;
            
            this.particles.push({
                x: this.bird.x,
                y: this.bird.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: 0.15, // fall down
                friction: 0.98,
                color: Math.random() > 0.4 ? skin.color : '#ffffff',
                size: size,
                life: 1.0,
                decay: 0.015 + Math.random() * 0.02,
                angle: Math.random() * Math.PI * 2,
                va: (Math.random() - 0.5) * 0.3,
                type: 'dust'
            });
        }
    }

    // --- Rendering Functions ---
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw parallax sky backdrop
        this.drawBackdrop();

        // Draw static layers
        this.drawParallaxStars();
        this.drawParallaxBuildings();

        // Draw pipes
        if (this.gameMode !== 'zen') {
            this.drawPipes();
        }

        // Draw ground grid
        this.drawGround();

        // Draw particles
        this.drawParticles();

        // Draw bird
        if (this.gameState !== 'START') {
            const skin = this.skins[this.activeSkin];
            skin.draw(this.ctx, this.bird.x, this.bird.y, this.bird.radius, this.bird.angle, this.tick);
        }
    }

    drawBackdrop() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#09090e');
        gradient.addColorStop(0.6, '#110c22');
        gradient.addColorStop(1, '#1b122e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawParallaxStars() {
        for (let star of this.stars) {
            star.brightness += star.pulseSpeed;
            if (star.brightness > 1 || star.brightness < 0.2) {
                star.pulseSpeed = -star.pulseSpeed;
            }
            this.ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
            this.ctx.fillRect(star.x, star.y, star.size, star.size);
        }
    }

    drawParallaxBuildings() {
        this.ctx.save();
        
        // Loop buildings and scroll them with tiny parallax ratio (e.g. 10%)
        const buildingSpeedRatio = 0.05;
        const scrollOffset = -(this.distanceTravelled * buildingSpeedRatio) % 300;
        
        this.ctx.translate(scrollOffset, 0);
        
        for (let b of this.buildings) {
            // Draw building shell
            this.ctx.fillStyle = b.color;
            const by = this.groundY - b.height;
            this.ctx.fillRect(b.x, by, b.width, b.height);

            // Draw border top with a neon trim line
            this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(b.x, by, b.width, b.height);

            // Draw glowing windows
            for (let w of b.windows) {
                if (w.glow) {
                    this.ctx.fillStyle = 'rgba(6, 182, 212, 0.25)'; // Neon cyan window
                } else {
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
                }
                this.ctx.fillRect(b.x + w.dx, by + w.dy, 4, 6);
            }
        }
        
        this.ctx.restore();
    }

    drawPipes() {
        for (let p of this.pipes) {
            const topPipeBottom = p.centerY - p.gap / 2;
            const bottomPipeTop = p.centerY + p.gap / 2;

            // Neon Gradient for pipe borders
            const grad = this.ctx.createLinearGradient(p.x, 0, p.x + p.width, 0);
            grad.addColorStop(0, 'rgba(6, 182, 212, 0.15)'); // Glow Cyan
            grad.addColorStop(0.5, 'rgba(139, 92, 246, 0.12)'); // Violet middle
            grad.addColorStop(1, 'rgba(6, 182, 212, 0.15)');
            
            // Draw glass panels
            this.ctx.fillStyle = grad;
            
            // Neon Stroke
            this.ctx.strokeStyle = '#06b6d4';
            this.ctx.shadowColor = '#06b6d4';
            this.ctx.shadowBlur = 10;
            this.ctx.lineWidth = 2.5;

            // --- TOP PIPE ---
            this.ctx.beginPath();
            this.ctx.fillRect(p.x, 0, p.width, topPipeBottom);
            // Draw borders
            this.ctx.moveTo(p.x, 0);
            this.ctx.lineTo(p.x, topPipeBottom);
            this.ctx.lineTo(p.x + p.width, topPipeBottom);
            this.ctx.lineTo(p.x + p.width, 0);
            this.ctx.stroke();

            // Top Pipe Lip (Cap)
            const lipHeight = 24;
            const lipExtend = 4;
            this.ctx.fillStyle = '#0f172a';
            this.ctx.fillRect(p.x - lipExtend, topPipeBottom - lipHeight, p.width + (lipExtend * 2), lipHeight);
            this.ctx.strokeRect(p.x - lipExtend, topPipeBottom - lipHeight, p.width + (lipExtend * 2), lipHeight);

            // --- BOTTOM PIPE ---
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.fillRect(p.x, bottomPipeTop, p.width, this.groundY - bottomPipeTop);
            // Draw borders
            this.ctx.moveTo(p.x, this.groundY);
            this.ctx.lineTo(p.x, bottomPipeTop);
            this.ctx.lineTo(p.x + p.width, bottomPipeTop);
            this.ctx.lineTo(p.x + p.width, this.groundY);
            this.ctx.stroke();

            // Bottom Pipe Lip (Cap)
            this.ctx.fillStyle = '#0f172a';
            this.ctx.fillRect(p.x - lipExtend, bottomPipeTop, p.width + (lipExtend * 2), lipHeight);
            this.ctx.strokeRect(p.x - lipExtend, bottomPipeTop, p.width + (lipExtend * 2), lipHeight);

            // Clean shadow effect for other rendering
            this.ctx.shadowBlur = 0;
        }
    }

    drawGround() {
        this.ctx.save();
        
        // Ground plate
        this.ctx.fillStyle = '#0d0d15';
        this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);
        
        // Neon green/cyan edge line
        this.ctx.strokeStyle = '#8b5cf6';
        this.ctx.shadowColor = '#8b5cf6';
        this.ctx.shadowBlur = 12;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.groundY);
        this.ctx.lineTo(this.width, this.groundY);
        this.ctx.stroke();

        this.ctx.shadowBlur = 0;

        // Scrolling grid lines for ground
        this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.25)';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        for (let i = 0; i <= this.width + 30; i += 24) {
            this.ctx.moveTo(i + this.groundScroll, this.groundY);
            // Perspective ground lines angling down
            this.ctx.lineTo(i + (i - this.width/2) * 0.4 + this.groundScroll, this.height);
        }
        this.ctx.stroke();

        // Horizontal perspective lines
        this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)';
        this.ctx.beginPath();
        let gridH = 12;
        let hy = this.groundY;
        while (hy < this.height) {
            this.ctx.moveTo(0, hy);
            this.ctx.lineTo(this.width, hy);
            hy += gridH;
            gridH += 5; // spacing increases for depth feel
        }
        this.ctx.stroke();
        
        this.ctx.restore();
    }

    drawParticles() {
        this.ctx.save();
        
        for (let p of this.particles) {
            this.ctx.save();
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.shadowColor = p.color;
            this.ctx.shadowBlur = p.type === 'dust' ? 0 : 8;

            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.angle);

            // Shape customized based on skin emitter
            if (p.type === 'classic') {
                // Oval feather shape
                this.ctx.beginPath();
                this.ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.8, 0, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (p.type === 'cyber') {
                // Digital neon square sparkles
                this.ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
            } else if (p.type === 'golden') {
                // Sparkly star/diamond shapes
                this.ctx.beginPath();
                this.ctx.moveTo(0, -p.size);
                this.ctx.lineTo(p.size * 0.7, 0);
                this.ctx.lineTo(0, p.size);
                this.ctx.lineTo(-p.size * 0.7, 0);
                this.ctx.closePath();
                this.ctx.fill();
            } else if (p.type === 'phoenix') {
                // Expanding fire circles
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.size * (2 - p.life), 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                // Default circles
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.restore();
        }

        this.ctx.restore();
    }

    // --- Drawing programmatic birds ---

    drawClassicBird(ctx, x, y, size, angle, tick) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Wings flap cycle
        const wingFlap = Math.sin(tick * 0.35) * 8;

        // Body Shadow Glow
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 10;

        // Yellow Body
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;

        // Big white eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(6, -4, 6, 0, Math.PI * 2);
        ctx.fill();

        // Dark pupil
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(8, -4, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Orange Beak
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(size - 3, -2);
        ctx.lineTo(size + 8, 2);
        ctx.lineTo(size - 3, 6);
        ctx.closePath();
        ctx.fill();

        // Flapping Wing
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.ellipse(-6, wingFlap / 2, 7, 10, -0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawCyberBird(ctx, x, y, size, angle, tick) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Body outline (slealth jet style)
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 12;
        
        const grad = ctx.createLinearGradient(-15, 0, 15, 0);
        grad.addColorStop(0, '#0284c7');
        grad.addColorStop(1, '#06b6d4');
        ctx.fillStyle = grad;

        // Main geometric hull
        ctx.beginPath();
        ctx.moveTo(-18, -4);
        ctx.lineTo(4, -12);
        ctx.lineTo(18, 0);
        ctx.lineTo(4, 12);
        ctx.lineTo(-18, 4);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Cyber Thruster glow flame
        const flameLen = 12 + Math.abs(Math.sin(tick * 0.4)) * 10;
        const thrusterGrad = ctx.createLinearGradient(-30, 0, -18, 0);
        thrusterGrad.addColorStop(0, 'rgba(236, 72, 153, 0.05)'); // Hot pink outer
        thrusterGrad.addColorStop(1, '#ec4899'); // Neon pink core
        ctx.fillStyle = thrusterGrad;
        
        ctx.beginPath();
        ctx.moveTo(-18, -3);
        ctx.lineTo(-18 - flameLen, 0);
        ctx.lineTo(-18, 3);
        ctx.closePath();
        ctx.fill();

        // Cockpit glass
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(4, -6);
        ctx.lineTo(14, 0);
        ctx.lineTo(4, 6);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    drawGoldenBird(ctx, x, y, size, angle, tick) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        const wingFlap = Math.sin(tick * 0.3) * 11;

        // Metal gold gradient
        const grad = ctx.createLinearGradient(-16, -16, 16, 16);
        grad.addColorStop(0, '#fbbf24');
        grad.addColorStop(0.5, '#d97706');
        grad.addColorStop(1, '#fef08a');
        
        ctx.fillStyle = grad;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 12;

        // Eagle head shape
        ctx.beginPath();
        ctx.arc(0, 0, size, 0.15, Math.PI * 1.85);
        ctx.lineTo(size + 10, -2); // sharp beak top
        ctx.lineTo(size + 2, 8);  // beak bottom curve
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Emerald mechanical eye
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(6, -4, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Floating little royalty crown
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(-6, -19);
        ctx.lineTo(-9, -26);
        ctx.lineTo(-4, -22);
        ctx.lineTo(0, -28);
        ctx.lineTo(4, -22);
        ctx.lineTo(9, -26);
        ctx.lineTo(6, -19);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Metallic Eagle Wings
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.lineTo(-16, wingFlap);
        ctx.lineTo(-10, wingFlap + 4);
        ctx.lineTo(-2, 4);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    drawPhoenixBird(ctx, x, y, size, angle, tick) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Flapping wings
        const wingFlap = Math.sin(tick * 0.4) * 12;

        // Fiery radial gradient
        const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, size);
        grad.addColorStop(0, '#fef08a'); // yellow core
        grad.addColorStop(0.4, '#f97316'); // orange body
        grad.addColorStop(0.9, '#dc2626'); // red border
        
        ctx.fillStyle = grad;
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 18;

        // Soft phoenix bird shape
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();

        // Fiery tail plumes extending backwards
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(-size + 2, -2);
        ctx.lineTo(-size - 18 - Math.abs(Math.sin(tick*0.35))*8, -8);
        ctx.lineTo(-size - 4, 0);
        ctx.lineTo(-size - 16 - Math.abs(Math.cos(tick*0.35))*8, 8);
        ctx.lineTo(-size + 2, 2);
        ctx.closePath();
        ctx.fill();

        // Fiery eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(5, -4, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(6, -4, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Golden fiery wings
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.moveTo(-2, 0);
        ctx.lineTo(-14, wingFlap - 4);
        ctx.lineTo(-20, wingFlap);
        ctx.lineTo(-6, 6);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

// Create a globally accessible singleton instance
const Game = new GameEngine('game-canvas');
window.GameEngine = Game; // Expose to window
