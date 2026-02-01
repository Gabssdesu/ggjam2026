import { Graphics, Rectangle } from 'pixi.js';
import { CHARACTER_SPEED } from '../../constants/game-world';

export class Projectile {
    x = 0;
    y = 0;
    vx = 0;
    vy = 0;
    speed = 8;
    sprite = null;
    active = true;
    width = 10;
    height = 10;

    constructor(x, y, direction) {
        this.x = x;
        this.y = y;

        // Define a direção do tiro baseado na direção do herói
        switch (direction) {
            case 'right': this.vx = this.speed; break;
            case 'left': this.vx = -this.speed; break;
            case 'up': this.vy = -this.speed; break;
            case 'down': this.vy = this.speed; break;
            default: this.vx = this.speed; // Default pra direita
        }

        // Criar visual do projétil (bola de energia por enquanto)
        this.sprite = new Graphics();
        this.sprite.circle(0, 0, 5); // Raio 5
        this.sprite.fill({ color: 0x00ffff }); // Ciano brilhante
        this.sprite.stroke({ color: 0xffffff, width: 2 });
        this.sprite.x = x;
        this.sprite.y = y;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.sprite.x = this.x;
        this.sprite.y = this.y;
    }

    getBounds() {
        // Retorna retângulo de colisão simples
        return new Rectangle(this.x - 5, this.y - 5, 10, 10);
    }

    destroy() {
        this.sprite.destroy();
        this.active = false;
    }
}
