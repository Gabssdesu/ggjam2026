import { AnimatedSprite, Texture, Rectangle } from 'pixi.js';
import { GAME_CONFIG } from '../utils/gameConfig';

export class Hero {
    constructor(baseTexture, initialX = 100, initialY = 100) {
        // 1. Configuração do fatiamento (Ajuste esses valores de acordo com seu PNG)
        const frameWidth = 32;  // largura de um frame
        const frameHeight = 48; // altura de um frame
        
        // 2. Criar arrays de texturas para cada animação
        // Exemplo: Linha 0 = Idle, Linha 1 = Walk
        this.animations = {
            idle: this.extractFrames(baseTexture, 0, frameWidth, frameHeight, 4),
            walk: this.extractFrames(baseTexture, 1, frameWidth, frameHeight, 6)
        };

        // 3. Inicializar com AnimatedSprite em vez de Sprite comum
        this.sprite = new AnimatedSprite(this.animations.idle);
        this.sprite.animationSpeed = 0.15;
        this.sprite.play();

        // Configurações visuais
        this.sprite.anchor.set(0.5, 1); // Âncora nos pés ajuda no posicionamento
        this.sprite.x = initialX;
        this.sprite.y = initialY;
        this.sprite.width = 80;
        this.sprite.height = 100;
        
        this.x = initialX;
        this.y = initialY;
        this.currentAnimation = 'idle';
    }

    // Função auxiliar para cortar o PNG
    extractFrames(base, row, w, h, count) {
        const frames = [];
        for (let i = 0; i < count; i++) {
            const rect = new Rectangle(i * w, row * h, w, h);
            frames.push(new Texture({ source: base.source, frame: rect }));
        }
        return frames;
    }

    changeAnimation(key) {
        if (this.currentAnimation === key) return;
        this.currentAnimation = key;
        this.sprite.textures = this.animations[key];
        this.sprite.play();
    }

    update(input) {
        this.velocityX = 0;
        this.velocityY = 0;
        let isMoving = false;

        // Movimento Horizontal
        if (input.includes('left')) {
            this.velocityX = -GAME_CONFIG.CHARACTER_SPEED;
            this.sprite.scale.x = -Math.abs(this.sprite.scale.x); // Inverte para a esquerda
            isMoving = true;
        } else if (input.includes('right')) {
            this.velocityX = GAME_CONFIG.CHARACTER_SPEED;
            this.sprite.scale.x = Math.abs(this.sprite.scale.x); // Normal para a direita
            isMoving = true;
        }

        // Movimento Vertical
        if (input.includes('up')) {
            this.velocityY = -GAME_CONFIG.CHARACTER_SPEED;
            isMoving = true;
        } else if (input.includes('down')) {
            this.velocityY = GAME_CONFIG.CHARACTER_SPEED;
            isMoving = true;
        }

        // --- Lógica de Troca de Animação ---
        if (isMoving) {
            this.changeAnimation('walk');
        } else {
            this.changeAnimation('idle');
        }

        this.x += this.velocityX;
        this.y += this.velocityY;

        // Limites do canvas (Considerando a âncora 0.5)
        const halfWidth = this.sprite.width / 2;
        if (this.x < halfWidth) this.x = halfWidth;
        if (this.y < this.sprite.height) this.y = this.sprite.height;
        if (this.x > GAME_CONFIG.CANVAS_WIDTH - halfWidth) {
            this.x = GAME_CONFIG.CANVAS_WIDTH - halfWidth;
        }
        if (this.y > GAME_CONFIG.CANVAS_HEIGHT) {
            this.y = GAME_CONFIG.CANVAS_HEIGHT;
        }

        this.sprite.x = this.x;
        this.sprite.y = this.y;
    }

    getSprite() {
        return this.sprite;
    }
}