document.addEventListener('DOMContentLoaded', () => {
    // UI elements
    const startScreen = document.getElementById('start-screen');
    const settingsScreen = document.getElementById('settings-screen');
    const gameoverScreen = document.getElementById('gameover-screen');
    const pauseScreen = document.getElementById('pause-screen');
    const hud = document.getElementById('hud');
    
    const hudScore = document.getElementById('hud-score');
    const hudModeBadge = document.getElementById('hud-mode-badge');
    const hudMultiplier = document.getElementById('hud-multiplier');
    
    const startGameBtn = document.getElementById('start-game-btn');
    const openSettingsBtn = document.getElementById('open-settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const restartGameBtn = document.getElementById('restart-game-btn');
    const menuGameBtn = document.getElementById('menu-game-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const pauseMenuBtn = document.getElementById('pause-menu-btn');
    
    const volumeControl = document.getElementById('volume-control');
    const volumeVal = document.getElementById('volume-val');
    const musicControl = document.getElementById('music-control');
    
    const bestScoreDisplay = document.getElementById('best-score-display');
    const totalFlapsDisplay = document.getElementById('total-flaps-display');
    const finalScore = document.getElementById('final-score');
    const finalBest = document.getElementById('final-best');
    const newBestBadge = document.getElementById('new-best-badge');
    
    const medalSection = document.getElementById('medal-section');
    const medalIcon = document.getElementById('medal-icon');
    const medalName = document.getElementById('medal-name');
    
    const achievementBanner = document.getElementById('achievement-banner');
    const achievementName = document.getElementById('achievement-name');
    
    // Skins Carousel navigation
    const prevSkinBtn = document.querySelector('.carousel-nav.prev');
    const nextSkinBtn = document.querySelector('.carousel-nav.next');
    const skinNameLabel = document.getElementById('skin-name');
    const skinDescLabel = document.getElementById('skin-desc');
    const skinStatusLabel = document.getElementById('skin-status');
    
    // Skin keys ordered
    const skinKeys = ['classic', 'cyber', 'golden', 'phoenix'];
    let carouselIndex = 0;
    let previewTick = 0;
    let previewAnimFrameId = null;

    // Load persisted configurations
    loadSavedData();
    
    // Initialize Game Engine callbacks
    Game.onGameOverCallback = handleGameOver;
    Game.onScoreCallback = handleScoreChange;
    
    // Setup and trigger the main game canvas animation loop
    function mainGameLoop(timestamp) {
        Game.tickLoop(timestamp);
        requestAnimationFrame(mainGameLoop);
    }
    requestAnimationFrame(mainGameLoop);

    // Start skin preview animation loop
    startPreviewLoop();

    // --- Event Listeners ---
    
    // Controls: Fly on tap/click or keys
    const handleFlyTrigger = (e) => {
        // Prevent action if clicking UI elements
        if (e.target.closest('.overlay-screen') && !e.target.closest('.active')) return;
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
        
        if (Game.gameState === 'PLAYING') {
            Game.flap();
        }
    };
    
    // Canvas click
    document.getElementById('game-canvas').addEventListener('mousedown', handleFlyTrigger);
    document.getElementById('game-canvas').addEventListener('touchstart', handleFlyTrigger, { passive: true });
    
    // Keyboard inputs
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault();
            if (Game.gameState === 'PLAYING') {
                Game.flap();
            } else if (Game.gameState === 'START') {
                startFlight();
            } else if (Game.gameState === 'GAMEOVER') {
                restartFlight();
            }
        }
        
        // Pause triggers
        if (e.code === 'Escape' || e.code === 'KeyP') {
            e.preventDefault();
            togglePause();
        }
    });

    // Screen transitions
    startGameBtn.addEventListener('click', startFlight);
    restartGameBtn.addEventListener('click', restartFlight);
    
    openSettingsBtn.addEventListener('click', () => {
        showScreen(settingsScreen);
    });
    
    closeSettingsBtn.addEventListener('click', () => {
        showScreen(startScreen);
    });
    
    menuGameBtn.addEventListener('click', () => {
        showScreen(startScreen);
        Game.gameState = 'START';
        hud.classList.add('hidden');
    });

    pauseMenuBtn.addEventListener('click', () => {
        showScreen(startScreen);
        Game.gameState = 'START';
        hud.classList.add('hidden');
    });

    resumeBtn.addEventListener('click', togglePause);
    
    // Settings adjustments
    volumeControl.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        volumeVal.textContent = Math.round(val * 100) + '%';
        GameAudio.setVolume(val);
        localStorage.setItem('flappy_neon_volume', val);
    });
    
    musicControl.addEventListener('change', (e) => {
        const enabled = e.target.checked;
        GameAudio.toggleMusic(enabled);
        localStorage.setItem('flappy_neon_music', enabled);
    });

    // Game Mode selection tabs
    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mode = btn.dataset.mode;
            
            Game.setMode(mode);
            hudModeBadge.textContent = mode.toUpperCase();
            
            // Adjust badges or styling based on modes
            if (mode === 'hard') {
                hudModeBadge.style.background = 'linear-gradient(135deg, #ef4444 0%, #ec4899 100%)';
                hudModeBadge.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.5)';
            } else if (mode === 'zen') {
                hudModeBadge.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                hudModeBadge.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.4)';
            } else {
                hudModeBadge.style.background = 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)';
                hudModeBadge.style.boxShadow = '0 0 15px var(--accent-primary-glow)';
            }

            GameAudio.init(); // Initialize audio ctx if needed
        });
    });

    // Skin Carousel navigation listeners
    prevSkinBtn.addEventListener('click', () => {
        carouselIndex = (carouselIndex - 1 + skinKeys.length) % skinKeys.length;
        updateSkinSelection();
    });
    
    nextSkinBtn.addEventListener('click', () => {
        carouselIndex = (carouselIndex + 1) % skinKeys.length;
        updateSkinSelection();
    });

    // --- Functions ---

    function startFlight() {
        // Initialize Audio context on button click
        GameAudio.init();
        
        // Check if selected skin is unlocked
        const activeSkinKey = skinKeys[carouselIndex];
        const selectedSkin = Game.skins[activeSkinKey];
        
        if (!selectedSkin.unlocked) {
            // Screen shake or lock animation
            const skinCard = document.querySelector('.skin-card');
            skinCard.style.animation = 'none';
            setTimeout(() => {
                skinCard.style.animation = 'shake 0.3s';
            }, 10);
            return;
        }

        Game.setSkin(activeSkinKey);
        Game.start();
        
        showScreen(null); // Hide all screens
        hud.classList.remove('hidden');
        hudScore.textContent = '0';
        hudMultiplier.textContent = '1.0x';
    }

    function restartFlight() {
        GameAudio.init();
        Game.start();
        showScreen(null);
        hud.classList.remove('hidden');
        hudScore.textContent = '0';
        hudMultiplier.textContent = '1.0x';
    }

    function togglePause() {
        if (Game.gameState === 'PLAYING') {
            Game.togglePause();
            showScreen(pauseScreen);
        } else if (Game.gameState === 'PAUSED') {
            Game.togglePause();
            showScreen(null);
        }
    }

    function showScreen(screenToShow) {
        const screens = [startScreen, settingsScreen, gameoverScreen, pauseScreen];
        screens.forEach(screen => {
            if (screen === screenToShow) {
                screen.classList.add('active');
                screen.classList.remove('hidden');
            } else {
                screen.classList.remove('active');
                screen.classList.add('hidden');
            }
        });
    }

    function handleScoreChange(score) {
        hudScore.textContent = score;
        
        // Increase speed dynamic difficulty on Classic and Hard modes
        if (Game.gameMode !== 'zen') {
            const multiplier = 1.0 + Math.floor(score / 10) * 0.1;
            Game.speed = (Game.gameMode === 'hard' ? Game.baseSpeed + 1.0 : Game.baseSpeed) * multiplier;
            hudMultiplier.textContent = multiplier.toFixed(1) + 'x';
        }
    }

    function handleGameOver(score, highScore) {
        finalScore.textContent = score;
        finalBest.textContent = highScore;
        
        // Unhide "New Best" badge
        const prevHigh = parseInt(localStorage.getItem('flappy_neon_highscore') || '0');
        if (score > prevHigh && score > 0) {
            newBestBadge.classList.remove('hidden');
        } else {
            newBestBadge.classList.add('hidden');
        }

        // Save highscore and flaps to local storage
        localStorage.setItem('flappy_neon_highscore', highScore);
        const totalFlaps = parseInt(localStorage.getItem('flappy_neon_flaps') || '0') + Game.totalFlaps;
        localStorage.setItem('flappy_neon_flaps', totalFlaps);
        
        // Reset count for current run
        Game.totalFlaps = 0;
        
        // Check unlock statuses
        checkSkinUnlocks(highScore);
        
        // Check achievements
        checkAchievements(score, highScore, totalFlaps);

        // Assign and display medals
        displayMedal(score);

        // Update Start Screen stats
        bestScoreDisplay.textContent = highScore;
        totalFlapsDisplay.textContent = totalFlaps;

        // Transition overlay
        setTimeout(() => {
            showScreen(gameoverScreen);
            hud.classList.add('hidden');
        }, 800); // 800ms delay to let explosion particles spray
    }

    function displayMedal(score) {
        if (Game.gameMode === 'zen' || score < 10) {
            medalSection.classList.add('hidden');
            return;
        }

        medalSection.classList.remove('hidden');
        if (score >= 50) {
            medalIcon.textContent = '💎';
            medalName.textContent = 'Neon Diamond';
            medalName.style.color = '#38bdf8';
        } else if (score >= 30) {
            medalIcon.textContent = '🏆';
            medalName.textContent = 'Neon Gold';
            medalName.style.color = '#fbbf24';
        } else if (score >= 20) {
            medalIcon.textContent = '🥈';
            medalName.textContent = 'Neon Silver';
            medalName.style.color = '#cbd5e1';
        } else if (score >= 10) {
            medalIcon.textContent = '🥉';
            medalName.textContent = 'Neon Bronze';
            medalName.style.color = '#ea580c';
        }
    }

    function checkSkinUnlocks(highScore) {
        // Cyber unlocks at 10 score
        if (highScore >= Game.skins.cyber.unlockScore && !Game.skins.cyber.unlocked) {
            Game.skins.cyber.unlocked = true;
            triggerAchievementToast('Cyber Drone Unlocked!', 'Score 10+ achieved.');
        }
        // Golden Eagle unlocks at 30 score
        if (highScore >= Game.skins.golden.unlockScore && !Game.skins.golden.unlocked) {
            Game.skins.golden.unlocked = true;
            triggerAchievementToast('Golden Crest Unlocked!', 'Score 30+ achieved.');
        }
        // Phoenix unlocks at 50 score
        if (highScore >= Game.skins.phoenix.unlockScore && !Game.skins.phoenix.unlocked) {
            Game.skins.phoenix.unlocked = true;
            triggerAchievementToast('Phoenix Flame Unlocked!', 'Score 50+ achieved.');
        }

        // Update selector display matching current carousel index
        updateSkinSelection();
    }

    function checkAchievements(score, highScore, totalFlaps) {
        // We can track specific milestones that show a popup toast
        const unlockedAchievements = JSON.parse(localStorage.getItem('flappy_neon_achievements') || '[]');

        const checkAndUnlock = (id, name, desc) => {
            if (!unlockedAchievements.includes(id)) {
                unlockedAchievements.push(id);
                localStorage.setItem('flappy_neon_achievements', JSON.stringify(unlockedAchievements));
                triggerAchievementToast(name, desc);
            }
        };

        if (totalFlaps >= 1) checkAndUnlock('first_flight', 'First Flight', 'Initiate your very first flap.');
        if (totalFlaps >= 500) checkAndUnlock('flapper_pro', 'Frequent Flapper', 'Accumulate 500 total flaps.');
        if (score >= 20 && Game.gameMode === 'hard') checkAndUnlock('hard_corps', 'Gate Master', 'Score 20+ in Hard mode.');
        if (highScore >= 100) checkAndUnlock('century', 'Century Glide', 'Score 100+ points.');
    }

    function triggerAchievementToast(title, desc) {
        achievementName.textContent = title;
        const descEl = achievementBanner.querySelector('.toast-desc') || achievementBanner.querySelector('#achievement-name');
        descEl.textContent = desc;
        
        achievementBanner.classList.remove('hidden');
        
        // Hide after 4 seconds
        setTimeout(() => {
            achievementBanner.classList.add('hidden');
        }, 4000);
    }

    function updateSkinSelection() {
        const key = skinKeys[carouselIndex];
        const skin = Game.skins[key];
        
        skinNameLabel.textContent = skin.name;
        skinDescLabel.textContent = skin.desc;

        if (skin.unlocked) {
            skinStatusLabel.textContent = 'UNLOCKED';
            skinStatusLabel.className = 'skin-unlocked';
            skinNameLabel.style.opacity = '1.0';
            document.getElementById('skin-preview-canvas').style.filter = 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))';
        } else {
            skinStatusLabel.textContent = `SCORE ${skin.unlockScore} TO UNLOCK`;
            skinStatusLabel.className = 'skin-locked';
            skinNameLabel.style.opacity = '0.5';
            // Grayscale / locking filter
            document.getElementById('skin-preview-canvas').style.filter = 'drop-shadow(0 4px 10px rgba(0,0,0,0.3)) grayscale(1.0) brightness(0.5)';
        }
    }

    function startPreviewLoop() {
        const canvas = document.getElementById('skin-preview-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        const tickPreview = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const key = skinKeys[carouselIndex];
            const skin = Game.skins[key];
            
            ctx.save();
            // Draw background halo circle
            ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.beginPath();
            ctx.arc(30, 30, 22, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw selected bird at center
            skin.draw(ctx, 30, 30, 13, 0, previewTick);
            ctx.restore();
            
            previewTick++;
            previewAnimFrameId = requestAnimationFrame(tickPreview);
        };
        
        tickPreview();
    }

    function loadSavedData() {
        // High score
        const high = parseInt(localStorage.getItem('flappy_neon_highscore') || '0');
        Game.highScore = high;
        bestScoreDisplay.textContent = high;
        
        // Unlocks check based on high score
        Game.skins.classic.unlocked = true;
        Game.skins.cyber.unlocked = high >= Game.skins.cyber.unlockScore;
        Game.skins.golden.unlocked = high >= Game.skins.golden.unlockScore;
        Game.skins.phoenix.unlocked = high >= Game.skins.phoenix.unlockScore;
        
        updateSkinSelection();

        // Flaps count
        const flaps = parseInt(localStorage.getItem('flappy_neon_flaps') || '0');
        totalFlapsDisplay.textContent = flaps;

        // Sound volume
        const vol = localStorage.getItem('flappy_neon_volume');
        if (vol !== null) {
            const volFloat = parseFloat(vol);
            volumeControl.value = volFloat;
            volumeVal.textContent = Math.round(volFloat * 100) + '%';
            GameAudio.setVolume(volFloat);
        } else {
            GameAudio.setVolume(0.5);
        }

        // Background music toggle
        const music = localStorage.getItem('flappy_neon_music');
        if (music !== null) {
            const musicBool = music === 'true';
            musicControl.checked = musicBool;
            GameAudio.toggleMusic(musicBool);
        } else {
            GameAudio.toggleMusic(true);
        }
    }
});

// Custom CSS animation injector for skin shake effect
const style = document.createElement('style');
style.innerHTML = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-6px); }
    40%, 80% { transform: translateX(6px); }
}
`;
document.head.appendChild(style);
