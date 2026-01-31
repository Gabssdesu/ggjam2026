import React, { useEffect, useRef } from 'react';
import { Application, Sprite, Text, Assets, Graphics } from 'pixi.js';
import loiraImage from '../../assets/loira.png';
import mapaImage from '../../assets/mapa_teste.png'
import { Hero } from '../Hero/Hero.jsx';

const CANVAS_WIDTH = 1300;
const CANVAS_HEIGHT = 600;
const GROUND_Y = 400;
const CHARACTER_SPEED = 5

export default function Game() {
    const canvasRef = useRef(null);
    const appRef = useRef(null);
    const playerRef = useRef(null);
    const gameStateRef = useRef({
        playerX: 100,
        playerY: 400,
        movingDirection: [],
        directionHorizontal: 1,
        directionVertical: 0
    });

    // Mapa de colisão baseado na imagem (1 = bloqueado, 0 = passável) - tileSize 50px
    const collisionMap = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // Teto/parede superior
        [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],// Janelas
        [1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],// Faixa horizontal
        [1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0, 1, 1], // Mesas
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1], // Espaço livre
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1], // Espaço livre
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1], // Piso
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1], // Piso
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1], // Piso
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1], // Piso inferior
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1], // Piso inferior
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]  // Parede inferior
    ];

    // Verificar colisão antes de mover (considerando tamanho do personagem)
    // 1 bloco de largura = 50px, 2 blocos de altura = 100px
    const canMove = (newX, newY, playerWidth = 50, playerHeight = 100, tileSize = 50) => {
        // Verificar as 4 quinas do personagem
        const corners = [
            { x: newX, y: newY },
            { x: newX + playerWidth, y: newY },
            { x: newX, y: newY + playerHeight },
            { x: newX + playerWidth, y: newY + playerHeight }
        ];

        for (let corner of corners) {
            const col = Math.floor(corner.x / tileSize);
            const row = Math.floor(corner.y / tileSize);
            if (collisionMap[row]?.[col] === 1) {
                return false; // Colidiu com obstáculo
            }
        }
        return true; // Pode se mover
    };

    useEffect(() => {
        let destroyed = false;
        let app;
       // let player;
        let handleKeyDown;
        let handleKeyUp;

        const setup = async () => {
            if (canvasRef.current) {
                Array.from(canvasRef.current.childNodes).forEach(node => {
                    if (node.nodeName === 'CANVAS') {
                        canvasRef.current.removeChild(node);
                    }
                });
            }

            app = new Application();
            await app.init({
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                backgroundColor: 0x87ceeb,
            });
            appRef.current = app;
            if (canvasRef.current) {
                canvasRef.current.appendChild(app.canvas);
            }

            // Carregar e adicionar mapa como fundo
            const mapaTexture = await Assets.load(mapaImage);
            const mapa = new Sprite(mapaTexture);
            mapa.width = CANVAS_WIDTH;
            mapa.height = CANVAS_HEIGHT;
            app.stage.addChild(mapa);

            // Desenhar grid de colisão para debug
            const tileSize = 50;
            const gridGraphics = new Graphics();
            collisionMap.forEach((row, rowIndex) => {
                row.forEach((tile, colIndex) => {
                    const x = colIndex * tileSize;
                    const y = rowIndex * tileSize;
                    
                    // Desenhar retângulo semitransparente
                    if (tile === 1) {
                        gridGraphics.rect(x, y, tileSize, tileSize);
                        gridGraphics.fill({ color: 0xff0000, alpha: 0.3 }); // Vermelho para bloqueado
                    } else {
                        gridGraphics.rect(x, y, tileSize, tileSize);
                        gridGraphics.fill({ color: 0x00ff00, alpha: 0.1 }); // Verde claro para passável
                    }
                    
                    // Desenhar borda
                    gridGraphics.rect(x, y, tileSize, tileSize);
                    gridGraphics.stroke({ color: 0xffffff, width: 1, alpha: 0.5 });
                    
                    // Escrever número
                    const tileText = new Text({
                        text: tile.toString(),
                        style: {
                            fontSize: 16,
                            fill: tile === 1 ? 0xff0000 : 0x00ff00,
                            fontWeight: 'bold',
                        }
                    });
                    tileText.x = x + tileSize / 2 - 5;
                    tileText.y = y + tileSize / 2 - 8;
                    gridGraphics.addChild(tileText);
                });
            });
            app.stage.addChild(gridGraphics);

            // Carregar e adicionar personagem
           // const texture = await Assets.load(loiraImage);
            //player = new Sprite(texture);
            //player.x = gameStateRef.current.playerX;
            //player.y = gameStateRef.current.playerY;
            //player.width = 80;
            //player.height = 100;
            //app.stage.addChild(player);
            //playerRef.current = player;

            const heroTex = await Assets.load(loiraImage);
            const hero = new Hero(heroTex, gameStateRef.current.playerX, gameStateRef.current.playerY);
            app.stage.addChild(hero.getSprite());
            playerRef.current = hero;

            // Sistema de movimento
            handleKeyDown = (e) => {
                if (e.key === 'ArrowRight') {
                    gameStateRef.current.movingDirection.push('right');
                    gameStateRef.current.directionHorizontal = 1;
                } else if (e.key === 'ArrowLeft') {
                    gameStateRef.current.movingDirection.push('left');
                    gameStateRef.current.directionHorizontal = -1;
                } else if (e.key === 'ArrowDown') {
                    gameStateRef.current.movingDirection.push('down');
                    gameStateRef.current.directionVertical = 1;
                } else if (e.key === 'ArrowUp') {
                    gameStateRef.current.movingDirection.push('up');
                    gameStateRef.current.directionVertical = -1;
                }
            };
            handleKeyUp = (e) => {
                if (e.key === 'ArrowRight') {
                    gameStateRef.current.movingDirection = gameStateRef.current.movingDirection.filter((e) => e != 'right');
                    gameStateRef.current.directionHorizontal = 1;
                } else if (e.key === 'ArrowLeft') {
                    gameStateRef.current.movingDirection = gameStateRef.current.movingDirection.filter((e) => e != 'left');
                    gameStateRef.current.directionHorizontal = -1;
                } else if (e.key === 'ArrowDown') {
                    gameStateRef.current.movingDirection = gameStateRef.current.movingDirection.filter((e) => e != 'down');
                    gameStateRef.current.directionVertical = 1;
                } else if (e.key === 'ArrowUp') {
                    gameStateRef.current.movingDirection = gameStateRef.current.movingDirection.filter((e) => e != 'up');
                    gameStateRef.current.directionVertical = -1;
                }
            };

            window.addEventListener('keydown', handleKeyDown);
            window.addEventListener('keyup', handleKeyUp);

            // Loop de animação
            app.ticker.add(() => {
                if (destroyed) return;
                if (gameStateRef.current.movingDirection.length > 0) {
                    let newX = gameStateRef.current.playerX;
                    let newY = gameStateRef.current.playerY;

                    if (gameStateRef.current.movingDirection?.includes('left') || gameStateRef.current.movingDirection?.includes('right')) {
                        newX += gameStateRef.current.directionHorizontal * CHARACTER_SPEED;
                    }
                    if (gameStateRef.current.movingDirection?.includes('up') || gameStateRef.current.movingDirection?.includes('down')) {
                        newY += gameStateRef.current.directionVertical * CHARACTER_SPEED;
                    }

                    // Verificar colisão antes de atualizar posição
                    if (canMove(newX, newY, 50, 100)) {
                        gameStateRef.current.playerX = newX;
                        gameStateRef.current.playerY = newY;
                    }

                    // Limitar dentro dos limites da tela (personagem = 50 de largura, 100 de altura)
                    if (gameStateRef.current.playerX < 0) gameStateRef.current.playerX = 0;
                    if (gameStateRef.current.playerY < 0) gameStateRef.current.playerY = 0;
                    if (gameStateRef.current.playerX > CANVAS_WIDTH - 50) gameStateRef.current.playerX = CANVAS_WIDTH - 50;
                    if (gameStateRef.current.playerY > CANVAS_HEIGHT - 100) gameStateRef.current.playerY = CANVAS_HEIGHT - 100;

                    hero.getSprite().x = gameStateRef.current.playerX;
                    hero.getSprite().y = gameStateRef.current.playerY;
                }
            });
        };

        setup();

        return () => {
            destroyed = true;
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            if (appRef.current) {
                appRef.current.destroy(true, { children: true });
                appRef.current = null;
            }
            // Remover todos os canvas filhos do container
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
