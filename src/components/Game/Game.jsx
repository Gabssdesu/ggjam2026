import React, { useEffect, useRef, useState } from 'react';
import { Application, Sprite, Assets, Graphics, Container, Text } from 'pixi.js';
import { Heart } from 'lucide-react';
import loiraImage from '../../assets/heroina.png';
import { Hero } from '../Hero/Hero.jsx';
import { Enemy } from '../Enemy/Enemy.jsx';
import { Projectile } from '../Projectile/Projectile.js';
import inimigoImage from '../../assets/inimigo.png';
import devil1Sound from '../../assets/Devil1.m4a';
import devil2Sound from '../../assets/Devil2.m4a';
import inimigoRosaImage from '../../assets/inimigo_rosa.png';
import healPotionImage from '../../assets/heal_potion.png';
import MAPS from '../../constants/maps.js';
import {
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    INITIAL_PLAYER_X,
    INITIAL_PLAYER_Y,
    HERO_HITBOX_WIDTH,
    HERO_HITBOX_HEIGHT,
    ENEMY_HITBOX_WIDTH,
    ENEMY_HITBOX_HEIGHT,
    TILE_SIZE
} from '../../constants/game-world';

export default function Game() {
    const canvasRef = useRef(null);
    const appRef = useRef(null);
    const heroRef = useRef(null);
    const enemiesRef = useRef([]); // Array para múltiplos inimigos
    const projectilesRef = useRef([]); // Array para projéteis
    const maskItemRef = useRef(null); // Ref para o item da máscara
    const musicRef = useRef(null); // Referência para o áudio
    const loadMapFuncRef = useRef(null);
    const currentMapRef = useRef('HALLSPAWN');
    const mapSpriteRef = useRef(null);
    const debugLayerRef = useRef(null);
    const staminaRef = useRef(null);
    const ammoRef = useRef(null); // Ref para texto de munição
    const healthPotionsRef = useRef([]); // Array para poções de vida dropadas

    const [health, setHealth] = useState(3);
    const [gameOver, setGameOver] = useState(false);
    const gameOverRef = useRef(false);

    // Sincronizar ref com state
    useEffect(() => {
        gameOverRef.current = gameOver;
    }, [gameOver]);

    const [dialog, setDialog] = useState({ open: false, text: '' }); // Estado do Dialog

    const checkCollision = (r1, r2) => {
        const hit = r1.x < r2.x + r2.width &&
            r1.x + r1.width > r2.x &&
            r1.y < r2.y + r2.height &&
            r1.y + r1.height > r2.y;

        return hit;
    };

    // Helper para desenhar hitboxes no debug
    const drawHitbox = (rect, color, layer) => {
        if (!layer || !layer.visible) return;
        const g = new Graphics();
        g.rect(rect.x, rect.y, rect.width, rect.height);
        g.stroke({ color: color, width: 2 });
        layer.addChild(g);
    };

    useEffect(() => {
        let destroyed = false;
        let app;
        let ambientSoundTimeout;

        const playAmbientSound = () => {
            if (destroyed || gameOverRef.current) {
                // Se o jogo acabou, tenta agendar de novo para quando o jogo reiniciar
                // ou apenas para se destruído
                if (!destroyed) {
                    ambientSoundTimeout = setTimeout(playAmbientSound, 5000);
                }
                return;
            }

            const sounds = [devil1Sound, devil2Sound];
            const randomSound = sounds[Math.floor(Math.random() * sounds.length)];

            const audio = new Audio(randomSound);
            audio.volume = 0.3; // Volume mais baixo para ser um susto sutil
            audio.play().catch(e => console.log("Áudio ambiente bloqueado"));

            // Agenda o próximo som entre 15 e 45 segundos
            const nextTime = Math.random() * 10000 + 15000;
            ambientSoundTimeout = setTimeout(playAmbientSound, nextTime);
        };

        // Inicia o ciclo de sons ambientes após 10 segundos
        ambientSoundTimeout = setTimeout(playAmbientSound, 10000);

        const setup = async () => {
            if (canvasRef.current) {
                Array.from(canvasRef.current.childNodes).forEach(node => {
                    if (node.nodeName === 'CANVAS') {
                        canvasRef.current.removeChild(node);
                    }
                });
            }

            // Inicializar Pixi
            app = new Application();
            await app.init({
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                backgroundColor: 0x87ceeb,
                backgroundAlpha: 1
            });
            appRef.current = app;

            if (canvasRef.current && !destroyed) {
                canvasRef.current.appendChild(app.canvas);
            }

            // Camada de Debug
            // Camadas (Containers) para organizar o Z-Index
            const mapLayer = new Container();
            const gameLayer = new Container();
            const debugLayer = new Container();

            app.stage.addChild(mapLayer);
            app.stage.addChild(gameLayer);
            app.stage.addChild(debugLayer); // Debug por cima de tudo

            debugLayerRef.current = debugLayer;
            debugLayer.visible = false; // Começa invisível

            const loadMap = async (mapId, spawnX, spawnY) => {
                const config = MAPS[mapId];
                if (!config) return;

                console.log(`Carregando mapa: ${mapId}`);

                // Limpar camada do mapa
                mapLayer.removeChildren();

                // Limpar poções de vida ao mudar de mapa
                healthPotionsRef.current.forEach(potion => potion.destroy());
                healthPotionsRef.current = [];

                // Carregar e adicionar novo mapa
                const mapaTexture = await Assets.load(config.asset);
                const mapa = new Sprite(mapaTexture);
                mapa.width = CANVAS_WIDTH;
                mapa.height = CANVAS_HEIGHT;

                mapLayer.addChild(mapa);
                currentMapRef.current = mapId;

                // Reposicionar Herói
                if (heroRef.current) {
                    heroRef.current.x = spawnX;
                    heroRef.current.y = spawnY;
                    heroRef.current.updateSpritePosition();
                }

                // Gerenciar Música
                if (config.music) {
                    if (!musicRef.current || musicRef.current.src !== config.music) {
                        // Se houver música tocando e for diferente, para a anterior
                        if (musicRef.current) {
                            musicRef.current.pause();
                        }

                        // Cria e toca a nova música
                        const nextMusic = new Audio(config.music);
                        nextMusic.loop = true;
                        nextMusic.volume = 0.5; // Volume médio por padrão

                        // Tentar tocar (browser pode bloquear sem interação inicial)
                        nextMusic.play().catch(e => console.warn("Música bloqueada pelo browser. Clique no jogo para ouvir."));

                        musicRef.current = nextMusic;
                    }
                } else if (musicRef.current) {
                    // Se o mapa não tiver música, para a atual
                    musicRef.current.pause();
                    musicRef.current = null;
                }

                // Gerar inimigos do mapa - sempre respawna
                enemiesRef.current.forEach(e => e.destroy());
                enemiesRef.current = [];

                if (config.spawnEnemies) {
                    const enemyTex = await Assets.load(inimigoImage);
                    const enemyRosaTex = await Assets.load(inimigoRosaImage);

                    // Cria todos os inimigos do mapa
                    config.spawnEnemies.forEach((spawn) => {
                        // Sorteio do tipo (0: normal, 1: rosa)
                        // 50% de chance para cada
                        const isRosa = Math.random() > 0.5;
                        const texture = isRosa ? enemyRosaTex : enemyTex;
                        const enemy = new Enemy(texture, spawn.x, spawn.y);

                        gameLayer.addChild(enemy.getSprite());
                        enemiesRef.current.push(enemy);
                    });
                }

                // Spawnar Máscara se estiver no BEDROOM e ainda não tiver pego
                // Remove item da máscara anterior se existir de qualquer mapa antigo
                if (maskItemRef.current) {
                    maskItemRef.current.destroy();
                    maskItemRef.current = null;
                }

                // Spawnar Máscara se estiver no BEDROOM e ainda não tiver pego
                if (mapId === 'BEDROOM' && !hero.hasWeapon) {
                    const maskGraphics = new Graphics();
                    maskGraphics.rect(0, 0, 30, 30);
                    maskGraphics.fill({ color: 0xff00ff, alpha: 0.5 }); // Magenta semitransparente (hitbox debug)
                    maskGraphics.stroke({ color: 0xffffff, width: 2 });
                    maskGraphics.x = 400;
                    maskGraphics.y = 300;

                    gameLayer.addChild(maskGraphics); // Adiciona na gameLayer
                    maskItemRef.current = maskGraphics;
                }

                drawDebug(config);
            };
            loadMapFuncRef.current = loadMap;

            const drawDebug = (config) => {
                if (!debugLayerRef.current || !config.collisionMap) return;

                debugLayerRef.current.removeChildren();

                const textContainer = new Container();
                textContainer.eventMode = 'none';

                config.collisionMap.forEach((row, rowIndex) => {
                    row.forEach((tile, colIndex) => {
                        const x = colIndex * TILE_SIZE;
                        const y = rowIndex * TILE_SIZE;

                        const tileGraphic = new Graphics();

                        if (tile === 1) {
                            tileGraphic.rect(0, 0, TILE_SIZE, TILE_SIZE);
                            tileGraphic.fill({ color: 0xff0000, alpha: 0.3 });
                        } else {
                            tileGraphic.rect(0, 0, TILE_SIZE, TILE_SIZE);
                            tileGraphic.fill({ color: 0x00ff00, alpha: 0.1 });
                        }
                        tileGraphic.rect(0, 0, TILE_SIZE, TILE_SIZE);
                        tileGraphic.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });

                        tileGraphic.x = x;
                        tileGraphic.y = y;

                        tileGraphic.eventMode = 'static';
                        tileGraphic.cursor = 'pointer';
                        tileGraphic.on('pointerdown', () => {
                            config.collisionMap[rowIndex][colIndex] = tile === 1 ? 0 : 1;
                            drawDebug(config);
                        });

                        debugLayerRef.current.addChild(tileGraphic);

                        const tileText = new Text({
                            text: tile.toString(),
                            style: {
                                fontSize: 10,
                                fill: tile === 1 ? 0xffcccc : 0xccffcc,
                                fontWeight: 'bold'
                            }
                        });
                        tileText.x = x + 2;
                        tileText.y = y + 2;
                        textContainer.addChild(tileText);
                    });
                });

                if (config.doors) {
                    const doorsGraphics = new Graphics();
                    config.doors.forEach(door => {
                        const doorX = door.col * TILE_SIZE;
                        const doorY = door.row * TILE_SIZE;
                        const doorW = (door.w || 1) * TILE_SIZE;
                        const doorH = (door.h || 1) * TILE_SIZE;

                        doorsGraphics.rect(doorX, doorY, doorW, doorH);
                        doorsGraphics.fill({ color: 0x0000ff, alpha: 0.5 });
                        doorsGraphics.stroke({ color: 0xffffff, width: 2 });
                    });
                    debugLayerRef.current.addChild(doorsGraphics);
                }

                debugLayerRef.current.addChild(textContainer);
            };

            const heroTex = await Assets.load(loiraImage);
            const hero = new Hero(heroTex, INITIAL_PLAYER_X, INITIAL_PLAYER_Y);

            // Pré-carregar textura da poção
            const healPotionTex = await Assets.load(healPotionImage);

            // Função para dropar poção de vida
            const dropHealthPotion = (x, y) => {
                const potion = new Sprite(healPotionTex);
                potion.width = 50;
                potion.height = 50;
                potion.x = x;
                potion.y = y;
                gameLayer.addChild(potion);
                healthPotionsRef.current.push(potion);
            };

            // Configurar callback do tiro
            hero.onShoot = (x, y, dir) => {
                const projectile = new Projectile(x, y, dir);
                gameLayer.addChild(projectile.sprite); // Adiciona na gameLayer
                projectilesRef.current.push(projectile);
            };

            gameLayer.addChild(hero.getSprite()); // Adiciona na gameLayer
            heroRef.current = hero;

            await loadMap('HALLSPAWN', INITIAL_PLAYER_X, INITIAL_PLAYER_Y);

            app.ticker.add(() => {
                if (destroyed || (heroRef.current && heroRef.current.vida <= 0)) return;

                // Limpar debug dinâmico (hitboxes móveis)
                if (debugLayerRef.current && debugLayerRef.current.visible) {
                    // Remove apenas os não estáticos (que não são do mapa)
                    // Uma forma simples é remover os últimos filhos se tivermos controle, 
                    // ou criar um container filho só para dinâmicos.
                    // Por simplificação, vamos assumir que o drawDebug redesenha o estático se precisarmos limpar tudo
                    // Mas para performance, vamos criar um container separado dentro do debugLayer na próxima iteração.
                    // Por enquanto vamos desenhar hitboxes por cima na força bruta para debug
                    // Para limpar os hitboxes dinâmicos, precisamos de uma referência a eles.
                    // Uma abordagem é ter um container específico para hitboxes dinâmicos dentro do debugLayer.
                    // Por enquanto, vamos apenas redesenhar por cima, o que não é ideal para performance mas funciona para debug.
                    // Para uma limpeza real, precisaríamos armazenar as Graphics criadas por drawHitbox e removê-las.
                    // Por exemplo:
                    // dynamicDebugGraphics.forEach(g => g.destroy());
                    // dynamicDebugGraphics = [];
                    // Mas isso exigiria uma refatoração maior.
                }

                const currentMapConfig = MAPS[currentMapRef.current];
                hero.update(currentMapConfig?.collisionMap);

                // Atualizar UI
                if (staminaRef.current) {
                    staminaRef.current.style.width = `${hero.energia}%`;
                }
                if (ammoRef.current) {
                    ammoRef.current.innerText = hero.hasWeapon ? `${hero.ammo} / ${hero.maxAmmo}` : '';
                }

                enemiesRef.current.forEach(enemy => {
                    enemy.update(currentMapConfig?.collisionMap, hero);
                });

                // Atualizar Projéteis
                for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
                    const p = projectilesRef.current[i];
                    p.update();

                    // Remover se sair da tela ou colidir com parede (simples)
                    if (p.x < 0 || p.x > CANVAS_WIDTH || p.y < 0 || p.y > CANVAS_HEIGHT) {
                        p.destroy();
                        projectilesRef.current.splice(i, 1);
                        continue;
                    }

                    // Colisão Projétil x Inimigo
                    const pRect = p.getBounds();

                    for (let j = enemiesRef.current.length - 1; j >= 0; j--) {
                        const enemy = enemiesRef.current[j];
                        const eRect = {
                            x: enemy.x,
                            y: enemy.y,
                            width: ENEMY_HITBOX_WIDTH,
                            height: ENEMY_HITBOX_HEIGHT
                        };

                        if (checkCollision(pRect, eRect)) {
                            // Dropar poção de vida na posição do inimigo
                            dropHealthPotion(enemy.x, enemy.y);

                            // Matar Inimigo
                            enemy.destroy();
                            enemiesRef.current.splice(j, 1);

                            // Destruir Projétil
                            p.destroy();
                            projectilesRef.current.splice(i, 1);
                            break; // Sai do loop de inimigos pois o projétil já era
                        }
                    }
                }

                if (hero.x < 0) hero.x = 0;
                if (hero.y < 0) hero.y = 0;
                if (hero.x > CANVAS_WIDTH - HERO_HITBOX_WIDTH) hero.x = CANVAS_WIDTH - HERO_HITBOX_WIDTH;
                if (hero.y > CANVAS_HEIGHT - HERO_HITBOX_HEIGHT) hero.y = CANVAS_HEIGHT - HERO_HITBOX_HEIGHT;

                // Checar item da máscara
                if (maskItemRef.current && !hero.hasWeapon) {
                    const heroRect = { x: hero.x, y: hero.y, width: HERO_HITBOX_WIDTH, height: HERO_HITBOX_HEIGHT };
                    const maskRect = { x: maskItemRef.current.x, y: maskItemRef.current.y, width: 30, height: 30 };

                    if (checkCollision(heroRect, maskRect)) {
                        hero.hasWeapon = true;
                        hero.addAmmo(5); // Dá 5 munições ao pegar

                        // Remover visualmente e da memória
                        maskItemRef.current.destroy();
                        maskItemRef.current = null;

                        setDialog({
                            open: true,
                            text: 'MÁSCARA OBTIDA!\nVocê encontrou uma arma antiga.\nPressione Z para atirar.'
                        });
                        setTimeout(() => setDialog({ open: false, text: '' }), 4000); // Fecha auto em 4s
                    }
                }

                // Checar coleta de poções de vida
                const heroRect = { x: hero.x, y: hero.y, width: HERO_HITBOX_WIDTH, height: HERO_HITBOX_HEIGHT };
                for (let i = healthPotionsRef.current.length - 1; i >= 0; i--) {
                    const potion = healthPotionsRef.current[i];
                    const potionRect = { x: potion.x, y: potion.y, width: 50, height: 50 };

                    if (checkCollision(heroRect, potionRect)) {
                        // Curar meio coração (0.5 de vida), máximo 3
                        if (hero.vida < 3) {
                            hero.vida = Math.min(3, hero.vida + 0.5);
                            setHealth(hero.vida);

                            // Remover poção
                            potion.destroy();
                            healthPotionsRef.current.splice(i, 1);
                        }
                    }
                }

                // Colisão com Inimigos
                enemiesRef.current.forEach(enemy => {
                    const heroRect = {
                        x: hero.x,
                        y: hero.y,
                        width: HERO_HITBOX_WIDTH,
                        height: HERO_HITBOX_HEIGHT
                    };
                    const enemyRect = {
                        x: enemy.x,
                        y: enemy.y,
                        width: ENEMY_HITBOX_WIDTH,
                        height: ENEMY_HITBOX_HEIGHT
                    };

                    // Desenhar DEBUG (se ativo)
                    if (debugLayerRef.current && debugLayerRef.current.visible) {
                        drawHitbox(heroRect, 0x00ffff, debugLayerRef.current); // Herói Ciano
                        drawHitbox(enemyRect, 0xff0000, debugLayerRef.current); // Inimigo Vermelho
                    }

                    if (checkCollision(heroRect, enemyRect)) {
                        hero.takeDamage();
                        setHealth(hero.vida);
                        if (hero.vida <= 0) {
                            setGameOver(true);
                        }
                    }
                });

                hero.updateSpritePosition();

                if (currentMapConfig?.doors) {
                    const heroRect = {
                        x: hero.x,
                        y: hero.y,
                        width: HERO_HITBOX_WIDTH,
                        height: HERO_HITBOX_HEIGHT
                    };

                    for (const door of currentMapConfig.doors) {
                        const doorRect = {
                            x: door.col * TILE_SIZE,
                            y: door.row * TILE_SIZE,
                            width: (door.w || 1) * TILE_SIZE,
                            height: (door.h || 1) * TILE_SIZE
                        };

                        if (checkCollision(heroRect, doorRect)) {
                            loadMap(door.targetMap, door.spawnX, door.spawnY);
                            break;
                        }
                    }
                }
            });
        };

        setup();

        return () => {
            destroyed = true;
            if (heroRef.current) {
                heroRef.current.destroy();
            }
            enemiesRef.current.forEach(e => e.destroy());
            healthPotionsRef.current.forEach(potion => potion.destroy());
            if (musicRef.current) {
                musicRef.current.pause();
                musicRef.current = null;
            }
            if (ambientSoundTimeout) {
                clearTimeout(ambientSoundTimeout);
            }
            if (appRef.current) {
                appRef.current.destroy(true, { children: true });
                appRef.current = null;
            }
            if (canvasRef.current) {
                Array.from(canvasRef.current.childNodes).forEach(node => {
                    if (node.nodeName === 'CANVAS') {
                        canvasRef.current.removeChild(node);
                    }
                });
            }
        };
    }, []);

    const copyMapToClipboard = () => {
        const currentMap = MAPS[currentMapRef.current];
        if (!currentMap || !currentMap.collisionMap) return;

        const rows = currentMap.collisionMap.map(row =>
            `            [${row.join(', ')}]`
        );
        const matrixString = `        collisionMap: [\n${rows.join(',\n')}\n        ]`;

        navigator.clipboard.writeText(matrixString).then(() => {
            alert('Matriz copiada! Cole no arquivo maps.js');
        }).catch(err => {
            console.error(err);
        });
    };

    const toggleDebug = () => {
        if (debugLayerRef.current) {
            debugLayerRef.current.visible = !debugLayerRef.current.visible;
        }
    };

    const restartGame = () => {
        if (heroRef.current) {
            heroRef.current.vida = 3;
            heroRef.current.energia = 100;
            heroRef.current.x = INITIAL_PLAYER_X;
            heroRef.current.y = INITIAL_PLAYER_Y;
            heroRef.current.isInvincible = false;
            heroRef.current.sprite.tint = 0xffffff;
            heroRef.current.sprite.alpha = 1;
        }
        setHealth(3);
        setGameOver(false);

        if (loadMapFuncRef.current) {
            loadMapFuncRef.current('HALLSPAWN', INITIAL_PLAYER_X, INITIAL_PLAYER_Y);
        }
    };

    useEffect(() => {
        const handleAnyKey = () => {
            if (dialog.open) {
                setDialog({ ...dialog, open: false });
            }
        };
        window.addEventListener('keydown', handleAnyKey);
        return () => window.removeEventListener('keydown', handleAnyKey);
    }, [dialog.open]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#050510',
            height: '100vh',
            width: '100vw',
            overflow: 'hidden',
            fontFamily: 'monospace'
        }}>

            {/* CONTAINER DO JOGO COM BORDA RETRO */}
            <div style={{
                position: 'relative',
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                // Borda estilo moldura retrô
                border: '8px solid rgb(59, 59, 59)',
                outline: '4px solid rgb(30, 30, 30)',
                boxShadow: '0 0 50px rgba(0,0,0,0.8)',
                backgroundColor: '#000'
            }}>

                {/* CAMADA CANVAS */}
                <div ref={canvasRef} style={{ width: '100%', height: '100%' }} />

                {/* HUD OVERLAY - Usando Lucide Icons */}
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    zIndex: 10,
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    filter: 'drop-shadow(2px 2px 0 rgba(0,0,0,0.8))'
                }}>

                    {/* HEARTS ROW */}
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center'
                    }}>
                        {[...Array(3)].map((_, i) => (
                            <Heart
                                key={i}
                                size={32}
                                fill={i < health ? "#e74c3c" : "transparent"}
                                color={i < health ? "#fff" : "#333"}
                                strokeWidth={2}
                                style={{
                                    opacity: i < health ? 1 : 0.3,
                                    transition: 'all 0.3s ease'
                                }}
                            />
                        ))}
                    </div>

                    {/* STAMINA BAR CONTAINER */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                    }}>
                        <div style={{
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            textShadow: '2px 2px 0 #000',
                            letterSpacing: '2px',
                            marginLeft: '2px'
                        }}>STAMINA</div>

                        {/* THE BAR FRAME */}
                        <div style={{
                            width: '240px',
                            height: '24px',
                            backgroundColor: '#2d3436', // Dark frame bg
                            border: '4px solid #fff', // Borda Branca Grossa
                            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8), 4px 4px 0 #000', // Sombra externa dura
                            position: 'relative',
                            padding: '2px'
                        }}>
                            {/* PREENCHIMENTO DA BARRA */}
                            <div ref={staminaRef} style={{
                                width: '100%',
                                height: '100%',
                                backgroundColor: '#f1c40f',
                                backgroundImage: `linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)`,
                                backgroundSize: '20px 20px',
                                boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.2), inset 0 2px 0 rgba(255,255,255,0.4)',
                                transition: 'width 0.1s linear'
                            }} />
                        </div>
                    </div>

                    {/* AMMO COUNTER */}
                    <div style={{
                        position: 'absolute',
                        top: '100px', left: '0px',
                        color: 'cyan',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        textShadow: '2px 2px 0 #000',
                        fontFamily: 'monospace'
                    }}>
                        <span ref={ammoRef}></span>
                    </div>

                </div>

                {/* DIALOG BOX OVERLAY */}
                {dialog.open && (
                    <div style={{
                        position: 'absolute',
                        bottom: '20px', left: '50%',
                        transform: 'translateX(-50%)',
                        width: '50%',
                        backgroundColor: 'rgba(0, 0, 100, 0.9)',
                        border: '4px solid #fff',
                        boxShadow: '0 0 10px #000, inset 0 0 20px #000',
                        padding: '10px',
                        zIndex: 50,
                        color: '#fff',
                        fontFamily: 'monospace',
                        fontSize: '18px',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-line'
                    }}>
                        {dialog.text}
                        <div style={{
                            fontSize: '12px',
                            textAlign: 'right',
                            marginTop: '10px',
                            color: '#aaa',
                            fontStyle: 'italic'
                        }}>
                            Pressione qualquer tecla para fechar...
                        </div>
                    </div>
                )}

                {/* DEBUG TOOLS */}
                <div style={{
                    position: 'absolute',
                    top: '10px', right: '10px',
                    display: 'flex', gap: '5px',
                    zIndex: 20,
                    opacity: 0.8
                }}>
                    <button onClick={toggleDebug} style={{ border: '2px solid white', background: '#2980b9', color: 'white', fontFamily: 'monospace', cursor: 'pointer', fontSize: '10px' }}>DEBUG_VIEW</button>
                    <button onClick={copyMapToClipboard} style={{ border: '2px solid white', background: '#27ae60', color: 'white', fontFamily: 'monospace', cursor: 'pointer', fontSize: '10px' }}>COPY_MAP</button>
                </div>

                {/* GAME OVER OVERLAY */}
                {gameOver && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0,
                        width: '100%', height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        zIndex: 100,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        textAlign: 'center',
                        backdropFilter: 'blur(4px)'
                    }}>
                        <h1 style={{
                            fontSize: '64px',
                            marginBottom: '20px',
                            color: '#e74c3c',
                            textShadow: '4px 4px 0 #000',
                            letterSpacing: '8px'
                        }}>VOCÊ MORREU</h1>
                        <p style={{ fontSize: '18px', marginBottom: '40px', color: '#bdc3c7' }}>Os fantasmas te pegaram...</p>

                        <button
                            onClick={restartGame}
                            style={{
                                padding: '15px 40px',
                                fontSize: '24px',
                                backgroundColor: '#27ae60',
                                color: 'white',
                                border: '4px solid #fff',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                boxShadow: '4px 4px 0 #000',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'scale(1.1)'}
                            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                        >
                            TENTAR NOVAMENTE
                        </button>
                    </div>
                )}

            </div>

            <div style={{ marginTop: '16px', color: '#7f8c8d', fontSize: '12px' }}>
                GGJ 2026 PRE-ALPHA
            </div>
        </div >
    );
}
