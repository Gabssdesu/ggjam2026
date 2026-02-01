import { AnimatedSprite, Texture, Rectangle } from 'pixi.js';
import { canMove } from '../../utils/physics';
import {
    CHARACTER_SPEED,
    HERO_HITBOX_WIDTH,
    HERO_HITBOX_HEIGHT,
    ENEMY_HITBOX_WIDTH,
    ENEMY_HITBOX_HEIGHT,
    CANVAS_WIDTH,
    CANVAS_HEIGHT
} from '../../constants/game-world';

export class Enemy {
    // Propriedades Visuais
    sprite = null;
    animations = {};
    currentAnim = 'idle';
    x = 0;
    y = 0;

    // Movimento
    currentVx = 0;
    currentVy = 0;
    speed = CHARACTER_SPEED * 0.3; // Inimigo mais lento que o herói

    constructor(baseTexture, initialX, initialY) {
        this.x = initialX;
        this.y = initialY;

        // Configuração do sprite sheet (Ajuste para o inimigo.png na Row 0 com 24 frames)
        const cols = 24;
        const rows = 6;
        const fw = baseTexture.width / cols;
        const fh = baseTexture.height / rows;

        // Configurar animações (Tudo na Row 0)
        this.animations = {
            right: this.extract(baseTexture, 0, 0, fw, fh, 6),  // 0-5
            down: this.extract(baseTexture, 0, 6, fw, fh, 6),   // 6-11
            left: this.extract(baseTexture, 0, 12, fw, fh, 6),  // 12-17
            up: this.extract(baseTexture, 0, 18, fw, fh, 6),    // 18-23

            idle: this.extract(baseTexture, 0, 6, fw, fh, 1)    // Parado de frente
        };

        // Inicializar Sprite
        this.sprite = new AnimatedSprite(this.animations.idle);
        this.sprite.animationSpeed = 0.15;
        this.sprite.anchor.set(0.5, 1);
        this.sprite.play();

        // Configuração visual
        const targetHeight = 140;
        const scale = targetHeight / fh;
        this.sprite.scale.set(scale);
        this.updateSpritePosition();
    }

    destroy() {
        this.sprite.destroy();
    }

    extract(base, row, startCol, w, h, count) {
        const frames = [];
        for (let i = 0; i < count; i++) {
            const rect = new Rectangle((startCol + i) * w, row * h, w, h);
            frames.push(new Texture({ source: base.source, frame: rect }));
        }
        return frames;
    }

    update(collisionMap, hero) {
        if (!hero) return;

        // Vetor do Herói -> Inimigo
        const dx = this.x - hero.x;
        const dy = this.y - hero.y;

        // Verificar se está sendo visto
        // Baseado na animação atual do herói (agora suporta idles direcionais)
        let isSeen = false;
        const heroAnim = hero.currentAnim;

        // Verifica se a string da animação contem a direção (ex: 'right' ou 'idle_right')
        const lookingRight = heroAnim.includes('right');
        const lookingLeft = heroAnim.includes('left');
        const lookingDown = heroAnim.includes('down') || heroAnim === 'idle'; // Fallback
        const lookingUp = heroAnim.includes('up');

        // Lógica de Quadrantes Simples:
        if (lookingRight && dx > 0) isSeen = true;
        if (lookingLeft && dx < 0) isSeen = true;
        if (lookingDown && dy > 0) isSeen = true;
        if (lookingUp && dy < 0) isSeen = true;

        if (isSeen) {
            // CONGELA: Está sendo observado
            this.currentVx = 0;
            this.currentVy = 0;
        } else {
            // PERSEGUE: Não está sendo visto
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 10) {
                this.currentVx = (-dx / dist) * this.speed;
                this.currentVy = (-dy / dist) * this.speed;
            } else {
                this.currentVx = 0;
                this.currentVy = 0;
            }
        }

        let vx = this.currentVx;
        let vy = this.currentVy;
        let nextAnim = this.currentAnim;

        // Determinar animação baseado na velocidade atual
        if (vx > 0) nextAnim = 'right';
        else if (vx < 0) nextAnim = 'left';
        else if (vy > 0) nextAnim = 'down';
        else if (vy < 0) nextAnim = 'up';

        if (vx === 0 && vy === 0 && !isSeen) {
            nextAnim = 'idle';
        }

        if (vx !== 0 || vy !== 0) {
            const nextX = this.x + vx;
            const nextY = this.y + vy;

            let collided = false;

            // 1. Verificar limites da tela
            if (nextX < 0 || nextX > CANVAS_WIDTH - ENEMY_HITBOX_WIDTH) collided = true;
            if (nextY < 0 || nextY > CANVAS_HEIGHT - ENEMY_HITBOX_HEIGHT) collided = true;

            // 2. Verificar colisão com paredes
            if (!collided && !canMove(nextX, nextY, ENEMY_HITBOX_WIDTH, ENEMY_HITBOX_HEIGHT, collisionMap)) {
                collided = true;
            }

            if (!collided) {
                this.x = nextX;
                this.y = nextY;
            } else {
                // Se bater enquanto persegue, desliza (tenta mover só em um eixo)
                if (Math.abs(vx) > Math.abs(vy)) {
                    // Tenta mover só em Y
                    if (this.canMoveSafely(this.x, this.y + vy, collisionMap)) {
                        this.y += vy;
                    }
                } else {
                    // Tenta mover só em X
                    if (this.canMoveSafely(this.x + vx, this.y, collisionMap)) {
                        this.x += vx;
                    }
                }
            }

            if (this.currentAnim !== nextAnim) {
                this.currentAnim = nextAnim;
                this.sprite.textures = this.animations[nextAnim];
                this.sprite.play();
            }
        } else {
            // Se parado
            if (this.currentAnim !== 'idle' && this.currentAnim !== nextAnim) {
                this.currentAnim = 'idle';
                this.sprite.textures = this.animations.idle;
            }
            if (isSeen) {
                this.sprite.stop(); // Congela animação visualmente também!
            } else {
                this.sprite.play(); // Garante que volta a tocar se deixar de ser visto
            }
        }

        this.updateSpritePosition();
    }

    // Helper para verificar colisão simples usada no deslize
    canMoveSafely(tx, ty, collisionMap) {
        if (tx < 0 || tx > CANVAS_WIDTH - ENEMY_HITBOX_WIDTH) return false;
        if (ty < 0 || ty > CANVAS_HEIGHT - ENEMY_HITBOX_HEIGHT) return false;
        return canMove(tx, ty, ENEMY_HITBOX_WIDTH, ENEMY_HITBOX_HEIGHT, collisionMap);
    }

    updateSpritePosition() {
        // Agora o sprite é posicionado em relação ao CENTRO da hitbox
        this.sprite.x = this.x + ENEMY_HITBOX_WIDTH / 2;
        this.sprite.y = this.y + ENEMY_HITBOX_HEIGHT + 20; // Ajuste para descer o sprite em relação à hitbox
    }

    getSprite() { return this.sprite; }
}
