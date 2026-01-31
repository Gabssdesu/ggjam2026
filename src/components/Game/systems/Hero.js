import { Sprite, Assets } from 'pixi.js';
import { GAME_CONFIG } from '../utils/gameConfig';
import { HeroAnimation } from './HeroAnimation';

export class Hero {
    constructor(texture, initialX = 100, initialY = 100) {
        this.sprite = new Sprite(texture);
        this.sprite.x = initialX;
        this.sprite.y = initialY;
        this.sprite.width = 80;
        this.sprite.height = 100;
        
        this.x = initialX;
        this.y = initialY;
        this.velocityX = 0;
        this.velocityY = 0;
        
        // Sistema de animação
        this.animation = new HeroAnimation(texture, 64, 64, 9);
        this.lastDirection = 'DOWN';
        this.isMoving = false;
    }

    update(input) {
        // Resetar velocidade
        this.velocityX = 0;
        this.velocityY = 0;

        // Aplicar movimento baseado na entrada
        if (input.includes('left')) {
            this.velocityX = -GAME_CONFIG.CHARACTER_SPEED;
        } else if (input.includes('right')) {
            this.velocityX = GAME_CONFIG.CHARACTER_SPEED;
        }

        if (input.includes('up')) {
            this.velocityY = -GAME_CONFIG.CHARACTER_SPEED;
        } else if (input.includes('down')) {
            this.velocityY = GAME_CONFIG.CHARACTER_SPEED;
        }

        // Atualizar posição
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Limitar movimento aos limites do canvas
        if (this.x < 0) this.x = 0;
        if (this.y < 0) this.y = 0;
        if (this.x > GAME_CONFIG.CANVAS_WIDTH - this.sprite.width) {
            this.x = GAME_CONFIG.CANVAS_WIDTH - this.sprite.width;
        }
        if (this.y > GAME_CONFIG.CANVAS_HEIGHT - this.sprite.height) {
            this.y = GAME_CONFIG.CANVAS_HEIGHT - this.sprite.height;
        }

        // Sincronizar sprite com posição
        this.sprite.x = this.x;
        this.sprite.y = this.y;
    }

    getSprite() {
        return this.sprite;
    }
}
