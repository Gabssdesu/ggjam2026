import React, { useEffect, useRef } from 'react';
import { Application, Sprite, Assets, Graphics, Container, Text } from 'pixi.js';
import loiraImage from '../../assets/heroina.png';
import { Hero } from '../Hero/Hero.jsx';
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
    const currentMapRef = useRef('HALLSPAWN');
    const mapSpriteRef = useRef(null);
    const debugLayerRef = useRef(null);

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
                }

                // DEBUG: Desenhar grid de colisão
                if (debugLayerRef.current) {
                    debugLayerRef.current.removeChildren();

                    if (config.collisionMap) {
                        const graphics = new Graphics();
                        const textContainer = new Container();

                        config.collisionMap.forEach((row, rowIndex) => {
                            row.forEach((tile, colIndex) => {
                                const x = colIndex * TILE_SIZE;
                                const y = rowIndex * TILE_SIZE;

                                // Desenhar retângulo
                                if (tile === 1) {
                                    graphics.rect(x, y, TILE_SIZE, TILE_SIZE);
                                    graphics.fill({ color: 0xff0000, alpha: 0.3 }); // Vermelho bloqueado
                                } else {
                                    graphics.rect(x, y, TILE_SIZE, TILE_SIZE);
                                    graphics.fill({ color: 0x00ff00, alpha: 0.1 }); // Verde livre
                                }
                                graphics.rect(x, y, TILE_SIZE, TILE_SIZE);
                                graphics.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });

                                // Escrever numero
                                const tileText = new Text({
                                    text: tile.toString(),
                                    style: {
                                        fontSize: 12,
                                        fill: tile === 1 ? 0xffcccc : 0xccffcc, // Cor levemente diferente
                                        fontWeight: 'bold'
                                    }
                                });
                                tileText.x = x + TILE_SIZE / 2 - 5;
                                tileText.y = y + TILE_SIZE / 2 - 8;
                                textContainer.addChild(tileText);
                            });
                        });

                        debugLayerRef.current.addChild(graphics);
                        debugLayerRef.current.addChild(textContainer);
                    }
                }
            };

            // Carregar e adicionar personagem
            const heroTex = await Assets.load(loiraImage);
            const hero = new Hero(heroTex, INITIAL_PLAYER_X, INITIAL_PLAYER_Y);
            app.stage.addChild(hero.getSprite());
            heroRef.current = hero;

            // Adicionar camada de debug POR CIMA de tudo
            app.stage.addChild(debugLayer);

            await loadMap('HALLSPAWN', INITIAL_PLAYER_X, INITIAL_PLAYER_Y);

            // Loop de animação
            app.ticker.add(() => {
                if (destroyed) return;

                // O Hero agora gerencia seu próprio input e movimento
                // Passamos o mapa de colisão do mapa atual
                hero.update(MAPS[currentMapRef.current]?.collisionMap);

                // Limitar dentro dos limites da tela
                if (hero.x < 0) hero.x = 0;
                if (hero.y < 0) hero.y = 0;
                if (hero.x > CANVAS_WIDTH - HERO_HITBOX_WIDTH) hero.x = CANVAS_WIDTH - HERO_HITBOX_WIDTH;
                if (hero.y > CANVAS_HEIGHT - HERO_HITBOX_HEIGHT) hero.y = CANVAS_HEIGHT - HERO_HITBOX_HEIGHT;

                // Atualizar posição do sprite
                hero.updateSpritePosition();
            });
        };

        setup();

        return () => {
            destroyed = true;
            if (heroRef.current) {
                heroRef.current.destroy(); // Remove event listeners do herói
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

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f0f0f',
        }}>
            <div ref={canvasRef} style={{
                border: '3px solid #333',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                borderRadius: '8px',
                overflow: 'hidden',
            }} />
        </div>
    );
}
