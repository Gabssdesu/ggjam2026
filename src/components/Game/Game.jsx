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
                    heroRef.current.updateSpritePosition(); // Atualiza visual imediatamente
                }

                drawDebug(config);
            };

            const drawDebug = (config) => {
                if (!debugLayerRef.current || !config.collisionMap) return;

                debugLayerRef.current.removeChildren();

                // container para os textos ficarem por cima
                const textContainer = new Container();
                textContainer.eventMode = 'none'; // textos não bloqueiam clique

                config.collisionMap.forEach((row, rowIndex) => {
                    row.forEach((tile, colIndex) => {
                        const x = colIndex * TILE_SIZE;
                        const y = rowIndex * TILE_SIZE;

                        // Graphics separado para cada tile para permitir clique individual
                        const tileGraphic = new Graphics();

                        // Desenhar retângulo
                        if (tile === 1) {
                            tileGraphic.rect(0, 0, TILE_SIZE, TILE_SIZE);
                            tileGraphic.fill({ color: 0xff0000, alpha: 0.3 }); // Vermelho bloqueado
                        } else {
                            tileGraphic.rect(0, 0, TILE_SIZE, TILE_SIZE);
                            tileGraphic.fill({ color: 0x00ff00, alpha: 0.1 }); // Verde livre
                        }
                        tileGraphic.rect(0, 0, TILE_SIZE, TILE_SIZE);
                        tileGraphic.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });

                        tileGraphic.x = x;
                        tileGraphic.y = y;

                        // Interatividade
                        tileGraphic.eventMode = 'static';
                        tileGraphic.cursor = 'pointer';
                        tileGraphic.on('pointerdown', () => {
                            // Inverter valor
                            config.collisionMap[rowIndex][colIndex] = tile === 1 ? 0 : 1;
                            // Redesenhar
                            drawDebug(config);
                        });

                        debugLayerRef.current.addChild(tileGraphic);

                        // Escrever numero
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

                // Desenhar Portas para Debug
                if (config.doors) {
                    const doorsGraphics = new Graphics();
                    config.doors.forEach(door => {
                        const doorX = door.col * TILE_SIZE;
                        const doorY = door.row * TILE_SIZE;
                        const doorW = (door.w || 1) * TILE_SIZE;
                        const doorH = (door.h || 1) * TILE_SIZE;

                        doorsGraphics.rect(doorX, doorY, doorW, doorH);
                        doorsGraphics.fill({ color: 0x0000ff, alpha: 0.5 }); // Azul para portas
                        doorsGraphics.stroke({ color: 0xffffff, width: 2 });
                    });
                    debugLayerRef.current.addChild(doorsGraphics);
                }

                debugLayerRef.current.addChild(textContainer);
            };

            // Carregar e adicionar personagem
            const heroTex = await Assets.load(loiraImage);
            const hero = new Hero(heroTex, INITIAL_PLAYER_X, INITIAL_PLAYER_Y);
            app.stage.addChild(hero.getSprite());
            heroRef.current = hero;

            // Carregar e adicionar Inimigo de teste
            const enemyTex = await Assets.load(inimigoImage);
            const enemy = new Enemy(enemyTex, 400, 300);
            app.stage.addChild(enemy.getSprite());
            enemyRef.current = enemy;

            // Adicionar camada de debug POR CIMA de tudo
            app.stage.addChild(debugLayer);

            await loadMap('HALLSPAWN', INITIAL_PLAYER_X, INITIAL_PLAYER_Y);

            // Loop de animação
            app.ticker.add(() => {
                if (destroyed) return;

                // O Hero agora gerencia seu próprio input e movimento
                const currentMapConfig = MAPS[currentMapRef.current];
                hero.update(currentMapConfig?.collisionMap);

                // Atualizar Inimigo
                if (enemyRef.current) {
                    // Passamos o mapa de colisão E o herói para calcular perseguição
                    enemyRef.current.update(currentMapConfig?.collisionMap, hero);
                }

                // Limitar dentro dos limites da tela
                if (hero.x < 0) hero.x = 0;
                if (hero.y < 0) hero.y = 0;
                if (hero.x > CANVAS_WIDTH - HERO_HITBOX_WIDTH) hero.x = CANVAS_WIDTH - HERO_HITBOX_WIDTH;
                if (hero.y > CANVAS_HEIGHT - HERO_HITBOX_HEIGHT) hero.y = CANVAS_HEIGHT - HERO_HITBOX_HEIGHT;

                // Atualizar posição do sprite
                hero.updateSpritePosition();

                // Verificar Portas
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
                            // Colidiu com a porta!
                            loadMap(door.targetMap, door.spawnX, door.spawnY);
                            break; // Só entra em uma porta por vez
                        }
                    }
                }
            });
        };

        setup();

        return () => {
            destroyed = true;
            if (heroRef.current) {
                heroRef.current.destroy(); // Limpar listeners do herói
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

        // Formatar como array de arrays bonito
        const rows = currentMap.collisionMap.map(row =>
            `            [${row.join(', ')}]`
        );
        const matrixString = `        collisionMap: [\n${rows.join(',\n')}\n        ]`;

        navigator.clipboard.writeText(matrixString).then(() => {
            alert('Matriz copiada! Cole no arquivo maps.js');
            console.log(matrixString);
        }).catch(err => {
            console.error('Erro ao copiar:', err);
            console.log(matrixString); // Fallback
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
            width: '100vw'
        }}>
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
                    top: '60px', // Abaixo do botão copiar
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
