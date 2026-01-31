import { AnimatedSprite, Texture, Rectangle } from 'pixi.js';

export class Hero {
    constructor(baseTexture, initialX, initialY) {
        // 1. Configuração do Fatiamento (Ajuste conforme seu PNG)
        // Se seu PNG tem 4 colunas (frames) e 4 linhas (direções)
        const fw = baseTexture.width / 24; 
        const fh = baseTexture.height / 11;

        this.animations = {
            down:  this.extract(baseTexture, 0, fw, fh, 4),
            left:  this.extract(baseTexture, 1, fw, fh, 4),
            right: this.extract(baseTexture, 2, fw, fh, 4),
            up:    this.extract(baseTexture, 3, fw, fh, 4),
            idle:  [this.extract(baseTexture, 0, fw, fh, 1)[0]] // Primeiro frame parado
        };

        // 2. Inicialização do Sprite
        this.sprite = new AnimatedSprite(this.animations.idle);
        this.sprite.animationSpeed = 0.15;
        this.sprite.play();
        
        this.sprite.x = initialX;
        this.sprite.y = initialY;
        this.sprite.width = 80;
        this.sprite.height = 100;

        this.x = initialX;
        this.y = initialY;
        this.currentAnim = 'idle';
    }

    extract(base, row, w, h, count) {
        const frames = [];
        for (let i = 0; i < count; i++) {
            const rect = new Rectangle(i * w, row * h, w, h);
            frames.push(new Texture({ source: base.source, frame: rect }));
        }
        return frames;
    }

    update(input, canMoveCallback, config) {
        let vx = 0;
        let vy = 0;
        let nextAnim = 'idle';

        // Determinar direção e animação
        if (input.includes('left')) { vx = -config.speed; nextAnim = 'left'; }
        else if (input.includes('right')) { vx = config.speed; nextAnim = 'right'; }
        
        if (input.includes('up')) { vy = -config.speed; nextAnim = 'up'; }
        else if (input.includes('down')) { vy = config.speed; nextAnim = 'down'; }

        if (vx !== 0 || vy !== 0) {
            const nextX = this.x + vx;
            const nextY = this.y + vy;

            // Delegar verificação de colisão para o Game via callback
            if (canMoveCallback(nextX, nextY)) {
                this.x = nextX;
                this.y = nextY;
            }
            
            if (this.currentAnim !== nextAnim) {
                this.currentAnim = nextAnim;
                this.sprite.textures = this.animations[nextAnim];
                this.sprite.play();
            }
        } else {
            if (this.currentAnim !== 'idle') {
                this.currentAnim = 'idle';
                this.sprite.textures = this.animations.idle;
            }
        }

        // Sincronizar visual
        this.sprite.x = this.x;
        this.sprite.y = this.y;
    }

    getSprite() { return this.sprite; }
}