import React, { useState, useEffect, useCallback } from 'react';

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

  // Game constants - sekarang bisa berubah berdasarkan level
  const getGameConstants = () => ({
    GAME_WIDTH: 100,
    PLAYER_SPEED: 2,
    BULLET_SPEED: 3 + (level * 0.5), // Bullet lebih cepat tiap level
    ENEMY_SPEED: 0.5 + (level * 0.2), // Musuh lebih cepat
    ENEMY_SHOOT_RATE: 0.02 + (level * 0.01), // Musuh lebih sering nembak
    ENEMY_ROWS: Math.min(5 + Math.floor(level / 2), 8), // Tambah row tiap 2 level
    ENEMY_COLS: Math.min(10 + Math.floor(level / 3), 15) // Tambah column tiap 3 level
  });

  // Initialize enemies dengan pattern berdasarkan level
  const initEnemies = useCallback(() => {
    const constants = getGameConstants();
    const newEnemies = [];
    
    for (let row = 0; row < constants.ENEMY_ROWS; row++) {
      for (let col = 0; col < constants.ENEMY_COLS; col++) {
        newEnemies.push({
          id: `${row}-${col}`,
          x: col * (80 / constants.ENEMY_COLS) + 10,
          y: row * 5 + 10,
          alive: true,
          type: row % 5 // Cycle through 5 enemy types
        });
      }
    }
    setEnemies(newEnemies);
  }, [level]); // Re-init ketika level berubah

  // Initialize game
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setLives(3);
    setLevel(1);
    setPlayerPosition(50);
    setPlayerBullets([]);
    setEnemyBullets([]);
  };

  // Re-init enemies ketika level berubah
  useEffect(() => {
    if (gameState === 'playing') {
      initEnemies();
    }
  }, [level, gameState, initEnemies]);

  // Player movement
  useEffect(() => {
    if (gameState !== 'playing') return;

    const constants = getGameConstants();

    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft') {
        setPlayerPosition(prev => Math.max(0, prev - constants.PLAYER_SPEED));
      } else if (e.key === 'ArrowRight') {
        setPlayerPosition(prev => Math.min(constants.GAME_WIDTH - 4, prev + constants.PLAYER_SPEED));
      } else if (e.key === ' ' && gameState === 'playing') {
        // Shoot bullet - bisa multiple bullets berdasarkan level
        const maxBullets = Math.min(1 + Math.floor(level / 3), 3);
        if (playerBullets.length < maxBullets) {
          setPlayerBullets(prev => [...prev, {
            id: Date.now(),
            x: playerPosition + 1.5,
            y: 85
          }]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, playerPosition, level, playerBullets.length]);

  // Enemy movement
  useEffect(() => {
    if (gameState !== 'playing') return;

    const constants = getGameConstants();

    const moveEnemies = () => {
      setEnemies(prev => {
        let shouldMoveDown = false;
        const newEnemies = prev.map(enemy => {
          if (!enemy.alive) return enemy;
          
          let newX = enemy.x + constants.ENEMY_SPEED * enemyDirection;
          
          // Check boundary
          if (newX <= 0 || newX >= constants.GAME_WIDTH - 4) {
            shouldMoveDown = true;
          }
          
          return { ...enemy, x: newX };
        });

        if (shouldMoveDown) {
          setEnemyDirection(prev => -prev);
          return newEnemies.map(enemy => ({
            ...enemy,
            y: enemy.y + 2
          }));
        }

        return newEnemies;
      });
    };

    const interval = setInterval(moveEnemies, 200);
    return () => clearInterval(interval);
  }, [gameState, enemyDirection, level]);

  // Bullet movement
  useEffect(() => {
    if (gameState !== 'playing') return;

    const constants = getGameConstants();

    const gameLoop = setInterval(() => {
      // Move player bullets
      setPlayerBullets(prev => 
        prev.map(bullet => ({ ...bullet, y: bullet.y - constants.BULLET_SPEED }))
          .filter(bullet => bullet.y > 0)
      );

      // Move enemy bullets
      setEnemyBullets(prev => 
        prev.map(bullet => ({ ...bullet, y: bullet.y + constants.BULLET_SPEED }))
          .filter(bullet => bullet.y < 100)
      );

      // Enemy shooting - rate berdasarkan level
      if (Math.random() < constants.ENEMY_SHOOT_RATE) {
        const aliveEnemies = enemies.filter(e => e.alive);
        if (aliveEnemies.length > 0) {
          const shooter = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          setEnemyBullets(prev => [...prev, {
            id: Date.now(),
            x: shooter.x + 1.5,
            y: shooter.y + 3
          }]);
        }
      }
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, enemies, level]);

  // Collision detection
  useEffect(() => {
    if (gameState !== 'playing') return;

    // Player bullets vs enemies
    setPlayerBullets(prevBullets => {
      const newBullets = [...prevBullets];
      const hitBullets = new Set();

      setEnemies(prevEnemies => {
        return prevEnemies.map(enemy => {
          if (!enemy.alive) return enemy;

          for (let i = 0; i < newBullets.length; i++) {
            const bullet = newBullets[i];
            if (
              bullet.x >= enemy.x &&
              bullet.x <= enemy.x + 4 &&
              bullet.y >= enemy.y &&
              bullet.y <= enemy.y + 3
            ) {
              hitBullets.add(i);
              // Score lebih tinggi di level atas
              setScore(prev => prev + (5 - (enemy.type % 5)) * 10 * level);
              return { ...enemy, alive: false };
            }
          }
          return enemy;
        });
      });

      return newBullets.filter((_, index) => !hitBullets.has(index));
    });

    // Enemy bullets vs player
    setEnemyBullets(prevBullets => {
      const newBullets = [...prevBullets];
      const hitBullets = new Set();

      newBullets.forEach((bullet, index) => {
        if (
          bullet.x >= playerPosition &&
          bullet.x <= playerPosition + 4 &&
          bullet.y >= 85 &&
          bullet.y <= 90
        ) {
          hitBullets.add(index);
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setGameState('gameover');
              setHighScore(prevHigh => Math.max(prevHigh, score));
            }
            return newLives;
          });
        }
      });

      return newBullets.filter((_, index) => !hitBullets.has(index));
    });
  }, [gameState, playerPosition, score, level]);

  // Check win condition - Naik Level!
  useEffect(() => {
    if (gameState === 'playing' && enemies.length > 0 && enemies.every(enemy => !enemy.alive)) {
      // Level up!
      setTimeout(() => {
        setLevel(prev => prev + 1);
        setLives(prev => Math.min(prev + 1, 3)); // Bonus life setiap naik level
        setPlayerBullets([]);
        setEnemyBullets([]);
      }, 1000); // Delay sebentar sebelum level berikutnya
    }
  }, [enemies, gameState]);

  // Enemy colors based on type
  const getEnemyColor = (type) => {
    const colors = [
      'bg-retro-green',
      'bg-retro-blue', 
      'bg-retro-yellow',
      'bg-retro-purple',
      'bg-retro-red'
    ];
    return colors[type % 5];
  };

  const constants = getGameConstants();

  return (
    <div className="min-h-screen bg-retro-dark text-white font-retro flex items-center justify-center p-4">
      <div className="relative border-4 border-retro-purple rounded-lg bg-black p-6 max-w-2xl w-full">
        
        {/* Header dengan Level Info */}
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl text-retro-purple mb-2 animate-glow">
            SPACE INVADERS
          </h1>
          <div className="flex justify-between text-sm">
            <div>SCORE: <span className="text-retro-green">{score.toString().padStart(5, '0')}</span></div>
            <div>HI-SCORE: <span className="text-retro-yellow">{highScore.toString().padStart(5, '0')}</span></div>
            <div>LEVEL: <span className="text-retro-blue">{level}</span></div>
          </div>
          {/* Level Progress */}
          <div className="mt-2 text-retro-green text-xs">
            {level > 1 && `Level ${level} - Enemies: ${constants.ENEMY_ROWS}×${constants.ENEMY_COLS}`}
          </div>
        </div>

        {/* Game Area */}
        <div className="relative bg-black border-2 border-retro-blue rounded h-96 w-full overflow-hidden">
          
          {/* Stars background */}
          <div className="absolute inset-0">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-0.5 h-0.5 bg-white rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`
                }}
              />
            ))}
          </div>

          {/* Level Up Notification */}
          {gameState === 'playing' && enemies.length > 0 && enemies.every(enemy => !enemy.alive) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-retro-yellow text-xl animate-pulse">
                LEVEL {level + 1}!
              </div>
            </div>
          )}

          {/* Enemies */}
          {enemies.map(enemy => enemy.alive && (
            <div
              key={enemy.id}
              className={`absolute w-4 h-3 ${getEnemyColor(enemy.type)} rounded-sm transition-all duration-200`}
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
              className="absolute w-1 h-2 bg-retro-green rounded-full"
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
              className="absolute w-1 h-2 bg-retro-red rounded-full"
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
              className="absolute w-4 h-2 bg-retro-blue rounded-t-lg transition-all duration-100"
              style={{
                left: `${playerPosition}%`,
                top: '90%',
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="w-6 h-1 bg-retro-blue absolute -bottom-1 left-1/2 transform -translate-x-1/2 rounded-b-lg" />
            </div>
          )}

          {/* Game Over Overlay */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center">
              <div className="text-center">
                <div className="text-retro-red text-xl mb-4">GAME OVER</div>
                <div className="text-retro-yellow mb-2">FINAL SCORE: {score}</div>
                <div className="text-retro-blue mb-4">REACHED LEVEL: {level}</div>
                <button
                  onClick={startGame}
                  className="px-6 py-2 bg-retro-purple hover:bg-retro-blue transition-colors rounded"
                >
                  PLAY AGAIN
                </button>
              </div>
            </div>
          )}

          {/* Start Menu */}
          {gameState === 'menu' && (
            <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center">
              <div className="text-center">
                <div className="text-retro-purple text-2xl mb-6">SPACE INVADERS</div>
                <div className="text-retro-green text-sm mb-2">USE ARROW KEYS TO MOVE</div>
                <div className="text-retro-green text-sm mb-4">SPACEBAR TO SHOOT</div>
                <button
                  onClick={startGame}
                  className="px-8 py-3 bg-retro-purple hover:bg-retro-blue transition-colors rounded-lg text-lg"
                >
                  START GAME
                </button>
                <div className="mt-6 text-retro-yellow text-xs">
                  HI-SCORE: {highScore.toString().padStart(5, '0')}
                </div>
              </div>
            </div>
          )}

          {/* Lives Display */}
          {gameState === 'playing' && (
            <div className="absolute bottom-2 left-4 flex items-center space-x-2">
              <span className="text-retro-blue text-sm">LIVES:</span>
              {Array.from({ length: lives }).map((_, i) => (
                <div key={i} className="w-3 h-2 bg-retro-blue rounded-t" />
              ))}
            </div>
          )}

          {/* Multi-bullet Info */}
          {gameState === 'playing' && level >= 3 && (
            <div className="absolute bottom-2 right-4 text-retro-green text-xs">
              {Math.min(1 + Math.floor(level / 3), 3)}x BULLETS
            </div>
          )}
        </div>

        {/* Controls Info */}
        <div className="mt-4 text-center text-retro-green text-xs">
          ← → TO MOVE • SPACEBAR TO SHOOT • LEVEL: {level}
        </div>

        {/* Level Features Info */}
        <div className="mt-2 text-center text-retro-yellow text-xs">
          {level >= 3 && "★ MULTI-BULLET "}
          {level >= 5 && "★ FASTER ENEMIES "}
          {level >= 7 && "★ MORE ENEMIES "}
        </div>
      </div>
    </div>
  );
};

export default SpaceInvaders;