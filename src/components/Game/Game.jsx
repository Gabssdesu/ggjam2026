import React, { useEffect, useRef } from 'react';
import { Application, Sprite, Assets, Graphics, Container, Text } from 'pixi.js';
import { Heart } from 'lucide-react';
import loiraImage from '../../assets/heroina.png';
import { Hero } from '../Hero/Hero.jsx';
import { Enemy } from '../Enemy/Enemy.jsx';
import inimigoImage from '../../assets/inimigo.png';
import MAPS from '../../constants/maps.js';
import {
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    INITIAL_PLAYER_X,
    INITIAL_PLAYER_Y,
    HERO_HITBOX_WIDTH,
    HERO_HITBOX_HEIGHT,
    TILE_SIZE
} from '../../constants/game-world';

export default function Game() {
    const canvasRef = useRef(null);
    const appRef = useRef(null);
    const heroRef = useRef(null);
    const enemyRef = useRef(null);
    const currentMapRef = useRef('HALLSPAWN');
    const mapSpriteRef = useRef(null);
    const debugLayerRef = useRef(null);
    const staminaRef = useRef(null);

    const checkCollision = (r1, r2) => {
        return r1.x < r2.x + r2.width &&
            r1.x + r1.width > r2.x &&
            r1.y < r2.y + r2.height &&
            r1.y + r1.height > r2.y;
    };

    useEffect(() => {
        let destroyed = false;
        let app;

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
            const debugLayer = new Container();
            debugLayerRef.current = debugLayer;
            debugLayer.visible = false; // Começa invisível

            const loadMap = async (mapId, spawnX, spawnY) => {
                const config = MAPS[mapId];
                if (!config) return;

                console.log(`Carregando mapa: ${mapId}`);

                // Remover mapa antigo se existir
                if (mapSpriteRef.current) {
                    app.stage.removeChild(mapSpriteRef.current);
                }

                // Carregar e adicionar novo mapa
                const mapaTexture = await Assets.load(config.asset);
                const mapa = new Sprite(mapaTexture);
                mapa.width = CANVAS_WIDTH;
                mapa.height = CANVAS_HEIGHT;

                // Adiciona no índice 0 para ficar atrás do Herói
                app.stage.addChildAt(mapa, 0);
                mapSpriteRef.current = mapa;
                currentMapRef.current = mapId;

                // Reposicionar Herói
                if (heroRef.current) {
                    heroRef.current.x = spawnX;
                    heroRef.current.y = spawnY;
                    heroRef.current.updateSpritePosition();
                }

                drawDebug(config);
            };

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
            app.stage.addChild(hero.getSprite());
            heroRef.current = hero;

            const enemyTex = await Assets.load(inimigoImage);
            const enemy = new Enemy(enemyTex, 400, 300);
            app.stage.addChild(enemy.getSprite());
            enemyRef.current = enemy;

            app.stage.addChild(debugLayer);

            await loadMap('HALLSPAWN', INITIAL_PLAYER_X, INITIAL_PLAYER_Y);

            app.ticker.add(() => {
                if (destroyed) return;

                const currentMapConfig = MAPS[currentMapRef.current];
                hero.update(currentMapConfig?.collisionMap);

                // Atualizar UI
                if (staminaRef.current) {
                    staminaRef.current.style.width = `${hero.energia}%`;
                }

                if (enemyRef.current) {
                    enemyRef.current.update(currentMapConfig?.collisionMap, hero);
                }

                if (hero.x < 0) hero.x = 0;
                if (hero.y < 0) hero.y = 0;
                if (hero.x > CANVAS_WIDTH - HERO_HITBOX_WIDTH) hero.x = CANVAS_WIDTH - HERO_HITBOX_WIDTH;
                if (hero.y > CANVAS_HEIGHT - HERO_HITBOX_HEIGHT) hero.y = CANVAS_HEIGHT - HERO_HITBOX_HEIGHT;

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
                        <Heart size={32} fill="#e74c3c" color="#fff" strokeWidth={2} />
                        <Heart size={32} fill="#e74c3c" color="#fff" strokeWidth={2} />
                        <Heart size={32} fill="#e74c3c" color="#fff" strokeWidth={2} />
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

                </div>

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

            </div>

            <div style={{ marginTop: '16px', color: '#7f8c8d', fontSize: '12px' }}>
                GGJ 2026 PRE-ALPHA
            </div>
        </div>
    );
}
