import React, { useEffect, useRef } from 'react';
import { Application, Sprite, Text, Assets, Graphics } from 'pixi.js';
import loiraImage from '../../assets/loira.png';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GROUND_Y = 400;

export default function Game() {
    const canvasRef = useRef(null);
    const appRef = useRef(null);
    const playerRef = useRef(null);
    const gameStateRef = useRef({
        playerX: 100,
        playerY: 100,
        movingDirection: null,
        directionHorizontal: 1,
        directionVertical: 0
    });

    useEffect(() => {
        const initializeApp = async () => {
            // Criar aplicação PixiJS
            const app = new Application();
            await app.init({
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                backgroundColor: 0x87ceeb,
            });

            appRef.current = app;
            canvasRef.current?.appendChild(app.canvas);

            // Desenhar chão (retângulo verde)
            const ground = new Graphics();
            ground.rect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
            ground.fill({ color: 0x228b22 });
            app.stage.addChild(ground);

            // Carregar e adicionar personagem
            const texture = await Assets.load(loiraImage);
            const player = new Sprite(texture);
            player.x = gameStateRef.current.playerX;
            player.y = GROUND_Y - 100;
            player.width = 80;
            player.height = 100;
            app.stage.addChild(player);
            playerRef.current = player;

            // Sistema de movimento
            const handleKeyDown = (e) => {
                if (e.key === 'ArrowRight') {
                    gameStateRef.current.movingDirection = 'right';
                    gameStateRef.current.directionHorizontal = 1;
                } else if (e.key === 'ArrowLeft') {
                    gameStateRef.current.movingDirection = 'left';
                    gameStateRef.current.directionHorizontal = -1;
                } else if (e.key === 'ArrowDown') {
                    gameStateRef.current.movingDirection = 'down';
                    gameStateRef.current.directionVertical = 1;
                } else if (e.key === 'ArrowUp') {
                    gameStateRef.current.movingDirection = 'up';
                    gameStateRef.current.directionVertical = -1;
                }
            };

            const handleKeyUp = () => {
                gameStateRef.current.movingDirection = null;
            };

            window.addEventListener('keydown', handleKeyDown);
            window.addEventListener('keyup', handleKeyUp);

            // Loop de animação
            app.ticker.add(() => {
                if (gameStateRef.current.movingDirection) {
                    console.log(gameStateRef.movingDirection)
                    if(gameStateRef.current.movingDirection == 'left' || gameStateRef.current.movingDirection == 'right') gameStateRef.current.playerX += gameStateRef.current.directionHorizontal * 5;
                    if(gameStateRef.current.movingDirection == 'up' || gameStateRef.current.movingDirection == 'down') gameStateRef.current.playerY += gameStateRef.current.directionVertical * 5;

                    // Limitar movimento
                    if (gameStateRef.current.playerX < 0) gameStateRef.current.playerX = 0;
                    if (gameStateRef.current.playerX > CANVAS_WIDTH - 80) gameStateRef.current.playerX = CANVAS_WIDTH - 80;

                    player.x = gameStateRef.current.playerX;
                    player.y = gameStateRef.current.playerY;
                }
            });

            // Cleanup
            return () => {
                window.removeEventListener('keydown', handleKeyDown);
                window.removeEventListener('keyup', handleKeyUp);
                app.destroy();
            };
        };

        initializeApp();
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div ref={canvasRef} style={{ border: '2px solid #ccc' }} />

        </div>
    );
}
