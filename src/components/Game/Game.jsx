import React, { useEffect, useRef } from 'react';
import { Application, Sprite, Assets, Graphics, Container, Text } from 'pixi.js';
import loiraImage from '../../assets/heroina.png';
import { Hero } from '../Hero/Hero.jsx';
import { Enemy } from '../Enemy/Enemy.jsx';
import inimigoImage from '../../assets/inimigo.png';
import MAPS from '../../constants/maps.js'
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
            });
            appRef.current = app;

            if (canvasRef.current && !destroyed) {
                canvasRef.current.appendChild(app.canvas);
            }

            // Camada de Debug
            const debugLayer = new Container();
            debugLayerRef.current = debugLayer;

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
            console.log(matrixString);
        }).catch(err => {
            console.error('Erro ao copiar:', err);
            console.log(matrixString);
            alert('Erro ao copiar (veja console)');
        });
    };

    const toggleDebug = () => {
        if (debugLayerRef.current) {
            debugLayerRef.current.visible = !debugLayerRef.current.visible;
        }
    };

    return (
        <div style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000000ff',
            height: '100vh',
            width: '100vw',
            fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif'
        }}>

            {/* UI DE HUD (BORDAS E CORES) */}
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                // Estilo "Pixel Art" Scale
                transform: 'scale(2.5)',
                transformOrigin: 'top left'
            }}>

                {/* 1. HEALTH BAR (3 Divisões Vermelhas) */}
                <div style={{ display: 'flex', gap: '2px' }}>
                    {/* Bloco 1 */}
                    <div style={{
                        width: '20px', height: '10px',
                        backgroundColor: '#e74c3c', // Vermelho
                        border: '2px solid #fff',
                        boxShadow: '1px 1px 0 #000'
                    }} />
                    {/* Bloco 2 */}
                    <div style={{
                        width: '20px', height: '10px',
                        backgroundColor: '#e74c3c',
                        border: '2px solid #fff',
                        boxShadow: '1px 1px 0 #000'
                    }} />
                    {/* Bloco 3 */}
                    <div style={{
                        width: '20px', height: '10px',
                        backgroundColor: '#e74c3c',
                        border: '2px solid #fff',
                        boxShadow: '1px 1px 0 #000'
                    }} />
                </div>

                {/* 2. STAMINA BAR (Barra Laranja Contínua) */}
                <div style={{
                    width: '64px', // Largura total combinada dos 3 blocos + gaps (20*3 + 4 = 64)
                    height: '8px',
                    backgroundColor: '#222', // Fundo escuro quando vazio
                    border: '2px solid #fff',
                    boxShadow: '1px 1px 0 #000',
                    position: 'relative'
                }}>
                    <div ref={staminaRef} style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#f39c12', // Laranja
                        transition: 'width 0.1s linear'
                    }} />
                </div>

            </div>

            <button
                onClick={copyMapToClipboard}
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    zIndex: 100,
                    padding: '10px 20px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}
            >
                COPIAR MATRIZ (Debug)
            </button>

            <button
                onClick={toggleDebug}
                style={{
                    position: 'absolute',
                    top: '60px',
                    right: '20px',
                    zIndex: 100,
                    padding: '10px 20px',
                    backgroundColor: '#2196F3', // Azul
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}
            >
                TOGGLE DEBUG
            </button>

            <div ref={canvasRef} style={{
                border: '3px solid #333',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                borderRadius: '8px',
                overflow: 'hidden',
                // Cursor padrão no canvas para não confundir
            }} />
        </div>
    );
}
