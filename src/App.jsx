import React, { useState, useEffect, useCallback, useRef } from 'react';

const SpaceInvaders = () => {
  // Game state
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);

  // Player state
  const [playerPosition, setPlayerPosition] = useState(50);
  const [playerBullets, setPlayerBullets] = useState([]);

  // Enemy state
  const [enemies, setEnemies] = useState([]);
  const [enemyBullets, setEnemyBullets] = useState([]);
  const [enemyDirection, setEnemyDirection] = useState(1);

  // Refs untuk game loop
  const gameStateRef = useRef(gameState);
  const enemiesRef = useRef(enemies);
  const playerPositionRef = useRef(playerPosition);
  const playerBulletsRef = useRef(playerBullets);
  const enemyBulletsRef = useRef(enemyBullets);
  const enemyDirectionRef = useRef(enemyDirection);

  // Update refs ketika state berubah
  useEffect(() => {
    gameStateRef.current = gameState;
    enemiesRef.current = enemies;
    playerPositionRef.current = playerPosition;
    playerBulletsRef.current = playerBullets;
    enemyBulletsRef.current = enemyBullets;
    enemyDirectionRef.current = enemyDirection;
  }, [gameState, enemies, playerPosition, playerBullets, enemyBullets, enemyDirection]);

  // Game constants
  const getGameConstants = () => ({
    GAME_WIDTH: 100,
    PLAYER_SPEED: 3,
    BULLET_SPEED: 4,
    ENEMY_SPEED: 1 + (level * 0.2),
    ENEMY_SHOOT_RATE: 0.02 + (level * 0.005),
    ENEMY_ROWS: Math.min(3 + Math.floor(level / 2), 6),
    ENEMY_COLS: Math.min(8 + Math.floor(level / 2), 12)
  });

  // Initialize enemies
  const initEnemies = useCallback(() => {
    const constants = getGameConstants();
    const newEnemies = [];
    
    const horizontalSpacing = 70 / constants.ENEMY_COLS;
    const startX = 15;
    
    for (let row = 0; row < constants.ENEMY_ROWS; row++) {
      for (let col = 0; col < constants.ENEMY_COLS; col++) {
        newEnemies.push({
          id: `${row}-${col}-${Date.now()}`,
          x: startX + col * horizontalSpacing,
          y: row * 8 + 20,
          alive: true,
          type: row % 5
        });
      }
    }
    setEnemies(newEnemies);
    setEnemyDirection(1);
  }, [level]);

  // Initialize game
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setLives(3);
    setLevel(1);
    setPlayerPosition(50);
    setPlayerBullets([]);
    setEnemyBullets([]);
    initEnemies();
  };

  // Re-init enemies ketika level berubah
  useEffect(() => {
    if (gameState === 'playing') {
      initEnemies();
    }
  }, [level, gameState, initEnemies]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (gameStateRef.current !== 'playing') return;

      const constants = getGameConstants();

      if (e.key === 'ArrowLeft' || e.key === 'a') {
        setPlayerPosition(prev => Math.max(5, prev - constants.PLAYER_SPEED));
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        setPlayerPosition(prev => Math.min(95, prev + constants.PLAYER_SPEED));
      } else if ((e.key === ' ')) {
        shootBullet();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Shoot bullet function
  const shootBullet = () => {
    if (gameStateRef.current !== 'playing') return;
    
    const constants = getGameConstants();
    const maxBullets = Math.min(1 + Math.floor(level / 3), 3);
    
    if (playerBulletsRef.current.length < maxBullets) {
      setPlayerBullets(prev => [...prev, {
        id: Date.now() + Math.random(),
        x: playerPositionRef.current + 2,
        y: 88
      }]);
    }
  };

  // Touch controls untuk mobile
  const handleTouchMove = (e) => {
    if (gameState !== 'playing') return;
    
    const touch = e.touches[0];
    const gameContainer = document.querySelector('.game-container');
    if (!gameContainer) return;
    
    const rect = gameContainer.getBoundingClientRect();
    const touchX = ((touch.clientX - rect.left) / rect.width) * 100;
    
    setPlayerPosition(Math.max(5, Math.min(95, touchX)));
  };

// Enemy movement - FIXED! Hanya gerak kiri-kanan
  useEffect(() => {
    if (gameState !== 'playing') return;

    const constants = getGameConstants();

    const moveEnemies = () => {
      setEnemies(prevEnemies => {
        const aliveEnemies = prevEnemies.filter(enemy => enemy.alive);
        if (aliveEnemies.length === 0) return prevEnemies;
        
        // Cek batas dengan current direction
        let currentDir = enemyDirectionRef.current;
        let shouldChangeDirection = false;
        
        for (let enemy of aliveEnemies) {
          if (currentDir > 0 && enemy.x >= 82) {
            shouldChangeDirection = true;
            break;
          }
          if (currentDir < 0 && enemy.x <= 18) {
            shouldChangeDirection = true;
            break;
          }
        }

        // Ganti arah jika perlu
        if (shouldChangeDirection) {
          currentDir = -currentDir;
          setEnemyDirection(currentDir);
        }

        // Gerakkan semua enemies dengan arah yang baru (atau tetap)
        return prevEnemies.map(enemy => {
          if (!enemy.alive) return enemy;
          
          return { 
            ...enemy, 
            x: enemy.x + (constants.ENEMY_SPEED * currentDir)
          };
        });
      });
    };

    const interval = setInterval(moveEnemies, 150);
    return () => clearInterval(interval);
  }, [gameState, level]);

  // Bullet movement dan collision detection
  useEffect(() => {
    if (gameState !== 'playing') return;

    const constants = getGameConstants();

    const gameLoop = setInterval(() => {
      // Move player bullets
      setPlayerBullets(prevBullets => {
        const updatedBullets = prevBullets.map(bullet => ({
          ...bullet,
          y: bullet.y - constants.BULLET_SPEED
        })).filter(bullet => bullet.y > 10);

        return updatedBullets;
      });

      // Check collisions antara player bullets dan enemies
      setEnemies(prevEnemies => {
        const updatedEnemies = [...prevEnemies];
        let scoreToAdd = 0;
        
        playerBulletsRef.current.forEach(bullet => {
          for (let i = 0; i < updatedEnemies.length; i++) {
            const enemy = updatedEnemies[i];
            
            if (enemy.alive) {
              // Improved collision detection
              const bulletLeft = bullet.x - 1;
              const bulletRight = bullet.x + 1;
              const bulletTop = bullet.y - 2;
              const bulletBottom = bullet.y + 2;
              
              const enemyLeft = enemy.x;
              const enemyRight = enemy.x + 4;
              const enemyTop = enemy.y;
              const enemyBottom = enemy.y + 4;
              
              // Check if bullet collides with enemy
              if (bulletRight > enemyLeft && 
                  bulletLeft < enemyRight && 
                  bulletBottom > enemyTop && 
                  bulletTop < enemyBottom) {
                
                // Mark enemy as dead and add score
                updatedEnemies[i] = { ...enemy, alive: false };
                scoreToAdd += 100;
                
                // Remove the bullet that hit
                setPlayerBullets(prev => prev.filter(b => b.id !== bullet.id));
                break;
              }
            }
          }
        });

        if (scoreToAdd > 0) {
          setScore(prev => prev + scoreToAdd);
        }

        return updatedEnemies;
      });

      // Move enemy bullets dan cek collision dengan player
      setEnemyBullets(prev => 
        prev.map(bullet => ({ ...bullet, y: bullet.y + constants.BULLET_SPEED }))
          .filter(bullet => {
            const hitPlayer = 
              Math.abs(bullet.x - (playerPositionRef.current + 2)) < 6 &&
              Math.abs(bullet.y - 90) < 8;

            if (hitPlayer) {
              setLives(prevLives => {
                const newLives = prevLives - 1;
                if (newLives <= 0) {
                  setTimeout(() => {
                    setGameState('gameover');
                    setHighScore(prevHigh => Math.max(prevHigh, score));
                  }, 100);
                }
                return newLives;
              });
              return false;
            }
            
            return bullet.y < 100;
          })
      );

      // Enemy shooting
      if (Math.random() < constants.ENEMY_SHOOT_RATE) {
        const aliveEnemies = enemiesRef.current.filter(e => e.alive);
        if (aliveEnemies.length > 0) {
          const shooter = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          setEnemyBullets(prev => [...prev, {
            id: Date.now() + Math.random(),
            x: shooter.x + 2,
            y: shooter.y + 4
          }]);
        }
      }

    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, level, score]);

  // Check win condition
  useEffect(() => {
    if (gameState === 'playing' && enemies.length > 0 && enemies.every(enemy => !enemy.alive)) {
      setTimeout(() => {
        setLevel(prev => prev + 1);
        setLives(prev => Math.min(prev + 1, 5));
        setPlayerBullets([]);
        setEnemyBullets([]);
      }, 1000);
    }
  }, [enemies, gameState]);

  // Enemy colors based on type
  const getEnemyColor = (type) => {
    const colors = [
      'bg-green-500',
      'bg-blue-500', 
      'bg-yellow-500',
      'bg-purple-500',
      'bg-red-500'
    ];
    return colors[type % 5];
  };

  const constants = getGameConstants();
  const aliveEnemiesCount = enemies.filter(e => e.alive).length;

  return (
    <div className="min-h-screen bg-gray-900 text-white font-retro flex items-center justify-center p-2 sm:p-4">
      <div className="relative border-4 border-purple-600 rounded-lg bg-black p-4 sm:p-6 w-full max-w-2xl">
        
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl text-purple-400 mb-2 animate-pulse">
            STAR SCAPE
          </h1>
          <div className="flex justify-between text-xs sm:text-sm">
            <div>SCORE: <span className="text-green-400">{score.toString().padStart(5, '0')}</span></div>
            <div>HI-SCORE: <span className="text-yellow-400">{highScore.toString().padStart(5, '0')}</span></div>
            <div>LEVEL: <span className="text-blue-400">{level}</span></div>
          </div>
        </div>

        {/* Game Area */}
        <div 
          className="game-container relative bg-black border-2 border-blue-500 rounded h-64 sm:h-80 md:h-96 w-full overflow-hidden"
          onTouchMove={handleTouchMove}
        >
          {/* Stars background */}
          <div className="absolute inset-0">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`
                }}
              />
            ))}
          </div>

          {/* Level Up Notification */}
          {gameState === 'playing' && enemies.length > 0 && aliveEnemiesCount === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
              <div className="text-yellow-400 text-lg sm:text-xl animate-pulse text-center">
                LEVEL {level + 1}!<br />
                <span className="text-sm text-green-400">+1 LIFE</span>
              </div>
            </div>
          )}

          {/* Enemies */}
          {enemies.map(enemy => enemy.alive && (
            <div
              key={enemy.id}
              className={`absolute w-4 h-4 ${getEnemyColor(enemy.type)} rounded-sm transition-all duration-100`}
              style={{
                left: `${enemy.x}%`,
                top: `${enemy.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}

          {/* Player Bullets */}
          {playerBullets.map(bullet => (
            <div
              key={bullet.id}
              className="absolute w-2 h-4 bg-green-400 rounded-full"
              style={{
                left: `${bullet.x}%`,
                top: `${bullet.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}

          {/* Enemy Bullets */}
          {enemyBullets.map(bullet => (
            <div
              key={bullet.id}
              className="absolute w-2 h-4 bg-red-400 rounded-full"
              style={{
                left: `${bullet.x}%`,
                top: `${bullet.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}

          {/* Player */}
          {gameState === 'playing' && (
            <div
              className="absolute w-6 h-3 bg-blue-400 rounded-t-lg transition-all duration-100"
              style={{
                left: `${playerPosition}%`,
                top: '90%',
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="w-8 h-2 bg-blue-400 absolute -bottom-1 left-1/2 transform -translate-x-1/2 rounded-b-lg" />
            </div>
          )}

          {/* Game Over Overlay */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center">
              <div className="text-center p-4">
                <div className="text-red-400 text-lg sm:text-xl mb-4">GAME OVER</div>
                <div className="text-yellow-400 mb-2 text-sm sm:text-base">FINAL SCORE: {score}</div>
                <div className="text-blue-400 mb-4 text-sm sm:text-base">REACHED LEVEL: {level}</div>
                <button
                  onClick={startGame}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-500 transition-colors rounded text-sm sm:text-base"
                >
                  PLAY AGAIN
                </button>
              </div>
            </div>
          )}

          {/* Start Menu */}
          {gameState === 'menu' && (
            <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center">
              <div className="text-center p-4">
                <div className="text-purple-400 text-xl sm:text-2xl mb-4 sm:mb-6">STAR SCAPE</div>
                <div className="text-green-400 text-xs sm:text-sm mb-2">MOVE: ← → KEYS OR TOUCH</div>
                <div className="text-green-400 text-xs sm:text-sm mb-4">SHOOT: SPACEBAR OR TAP FIRE</div>
                <button
                  onClick={startGame}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 transition-colors rounded-lg text-base sm:text-lg"
                >
                  START GAME
                </button>
                <div className="mt-4 text-yellow-400 text-xs sm:text-sm">
                  HI-SCORE: {highScore.toString().padStart(5, '0')}
                </div>
              </div>
            </div>
          )}

          {/* Lives Display */}
          {gameState === 'playing' && (
            <div className="absolute bottom-2 left-2 sm:left-4 flex items-center space-x-1 sm:space-x-2">
              <span className="text-blue-400 text-xs sm:text-sm">LIVES:</span>
              {Array.from({ length: lives }).map((_, i) => (
                <div key={i} className="w-3 h-2 bg-blue-400 rounded-t" />
              ))}
            </div>
          )}

          {/* Direction Indicator */}
          {gameState === 'playing' && (
            <div className="absolute top-2 right-2 text-xs text-gray-400">
              {enemyDirection > 0 ? '→ MOVING RIGHT' : '← MOVING LEFT'}
            </div>
          )}
        </div>

        {/* Mobile Controls */}
        {gameState === 'playing' && (
          <div className="mt-4 flex justify-between items-center space-x-2">
            <button
              onTouchStart={() => setPlayerPosition(prev => Math.max(5, prev - 10))}
              className="flex-1 py-3 bg-purple-600 rounded-lg text-white text-sm active:bg-purple-500"
            >
              ← LEFT
            </button>
            
            <button
              onTouchStart={shootBullet}
              className="flex-1 py-3 bg-red-500 rounded-lg text-white text-sm mx-2 active:bg-red-400 animate-pulse"
            >
              FIRE
            </button>
            
            <button
              onTouchStart={() => setPlayerPosition(prev => Math.min(95, prev + 10))}
              className="flex-1 py-3 bg-purple-600 rounded-lg text-white text-sm active:bg-purple-500"
            >
              RIGHT →
            </button>
          </div>
        )}

        {/* Controls Info */}
        <div className="mt-3 text-center text-green-400 text-xs">
          {window.innerWidth < 768 ? 'TOUCH TO MOVE • TAP FIRE TO SHOOT' : '← → TO MOVE • SPACEBAR TO SHOOT'}
        </div>

        {/* Game Info */}
        <div className="mt-2 text-center text-gray-400 text-xs">
          Enemies: {aliveEnemiesCount} | Direction: {enemyDirection > 0 ? 'RIGHT →' : 'LEFT ←'} | Level: {level}
        </div>
      </div>
    </div>
  );
};

export default SpaceInvaders;