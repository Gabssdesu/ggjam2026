import React, { useEffect, useRef } from 'react';
import { Application, Sprite, Text, Assets, Graphics } from 'pixi.js';
import loiraImage from '../../assets/loira_cortada.png';
import mapaImage from '../../assets/mapa_teste.png'

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
        playerY: 100,
        movingDirection: [],
        directionHorizontal: 1,
        directionVertical: 0
    });

    useEffect(() => {
        let destroyed = false;
        let app;
        let player;
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

            // Carregar e adicionar personagem
            const texture = await Assets.load(loiraImage);
            player = new Sprite(texture);
            player.x = gameStateRef.current.playerX;
            player.y = GROUND_Y - 100;
            player.width = 80;
            player.height = 100;
            app.stage.addChild(player);
            playerRef.current = player;

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
                if (gameStateRef.current.movingDirection) {
                    if (gameStateRef.current.movingDirection?.includes('left') || gameStateRef.current.movingDirection?.includes('right')) gameStateRef.current.playerX += gameStateRef.current.directionHorizontal * CHARACTER_SPEED;
                    if (gameStateRef.current.movingDirection?.includes('up') || gameStateRef.current.movingDirection?.includes('down')) gameStateRef.current.playerY += gameStateRef.current.directionVertical * CHARACTER_SPEED;
                    if (gameStateRef.current.playerX < 0) gameStateRef.current.playerX = 0;
                    if (gameStateRef.current.playerY < 0) gameStateRef.current.playerY = 0;
                    if (gameStateRef.current.playerX > CANVAS_WIDTH - 80) gameStateRef.current.playerX = CANVAS_WIDTH - 80;
                    if (gameStateRef.current.playerY > CANVAS_HEIGHT - 80) gameStateRef.current.playerY = CANVAS_HEIGHT - 80;
                    player.x = gameStateRef.current.playerX;
                    player.y = gameStateRef.current.playerY;
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
