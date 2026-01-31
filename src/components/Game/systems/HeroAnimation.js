import { Texture, Rectangle } from 'pixi.js';

export class HeroAnimation {
    constructor(texture, frameWidth = 64, frameHeight = 64, totalFrames = 9) {
        this.texture = texture;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.totalFrames = totalFrames;
        
        this.currentFrame = 0;
        this.elapsedTime = 0;
        this.animationSpeed = 0.15; // Controla a velocidade da animação
        
        this.currentDirection = 'DOWN';
    }

    /**
     * Mapeia direção para linha do spritesheet
     */
    getRowByDirection(direction) {
        switch (direction) {
            case 'UP':
                return 8;
            case 'LEFT':
                return 9;
            case 'DOWN':
                return 10;
            case 'RIGHT':
                return 11;
            default:
                return 10; // DOWN como padrão
        }
    }

    /**
     * Cria uma textura cortada do spritesheet
     */
    createFrameTexture(row, column) {
        if (!this.texture) return null;

        return new Texture({
            source: this.texture.source,
            frame: new Rectangle(
                column * this.frameWidth,
                row * this.frameHeight,
                this.frameWidth,
                this.frameHeight
            ),
        });
    }

    /**
     * Atualiza a animação baseado no movimento
     */
    update(direction, isMoving) {
        this.currentDirection = direction || this.currentDirection;

        if (isMoving) {
            this.elapsedTime += this.animationSpeed;

            if (this.elapsedTime >= 1) {
                this.elapsedTime = 0;
                this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
            }
        } else {
            // Quando não está movendo, volta ao frame 0
            this.currentFrame = 0;
            this.elapsedTime = 0;
        }
    }

    /**
     * Retorna a textura do frame atual
     */
    getCurrentFrameTexture() {
        const row = this.getRowByDirection(this.currentDirection);
        return this.createFrameTexture(row, this.currentFrame);
    }

    /**
     * Define a velocidade da animação (quanto menor, mais rápido)
     */
    setAnimationSpeed(speed) {
        this.animationSpeed = speed;
    }

    /**
     * Reseta a animação
     */
    reset() {
        this.currentFrame = 0;
        this.elapsedTime = 0;
    }
}
