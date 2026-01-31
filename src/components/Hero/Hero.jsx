import { AnimatedSprite, Texture, Rectangle } from 'pixi.js';
import { canMove } from '../../utils/physics';
import { CHARACTER_SPEED, HERO_HITBOX_WIDTH, HERO_HITBOX_HEIGHT } from '../../constants/game-world';

export class Hero {
    // Propriedades Visuais
    sprite = null;
    animations = {};
    currentAnim = '';
    x = 0;
    y = 0;
    lastDirection = 'down'; // Começa olhando pra baixo
            
    // Estados de Input e Movimento
    movingDirection = [];
    directionHorizontal = 1;
    directionVertical = 0;
    isRunning = false;

    // Handlers de Eventos
    handleKeyDown = null;
    handleKeyUp = null;

    // Propriedades
    energia = 100;

    constructor(baseTexture, initialX, initialY) {
        this.x = initialX;
        this.y = initialY;

        // Configuração do sprite sheet
        const cols = 24;
        const rows = 11;
        const fw = baseTexture.width / cols;
        const fh = baseTexture.height / rows;

        // Configurar animações
        // Ordem especificada: direita, cima, esquerda, baixo (6 frames cada) na Row 0
        this.animations = {
            right: this.extract(baseTexture, 0, 0, fw, fh, 6),  // 0-5
            up: this.extract(baseTexture, 0, 6, fw, fh, 6),  // 6-11
            left: this.extract(baseTexture, 0, 12, fw, fh, 6), // 12-17
            down: this.extract(baseTexture, 0, 18, fw, fh, 6), // 18-23

            // Idles direcionais (1º frame de cada direção)
            idle_right: this.extract(baseTexture, 0, 0, fw, fh, 1),
            idle_up: this.extract(baseTexture, 0, 6, fw, fh, 1),
            idle_left: this.extract(baseTexture, 0, 12, fw, fh, 1),
            idle_down: this.extract(baseTexture, 0, 18, fw, fh, 1)
        };

        // Inicializar Sprite
        this.sprite = new AnimatedSprite(this.animations.idle_down);
        this.sprite.animationSpeed = 0.15;
        this.sprite.anchor.set(0.5, 1); // Ancorar nos pés
        this.sprite.play();

        // Configuração visual
        // Manter proporção original da arte para não achatar
        const targetHeight = 140;
        const scale = targetHeight / fh;
        this.sprite.scale.set(scale);
        this.updateSpritePosition();

        this.setupInput();
    }

    setupInput() {
        this.handleKeyDown = (e) => {
            const key = e.key;
            if (key === 'ArrowRight') {
                this.movingDirection.push('right');
                this.directionHorizontal = 1;
            } else if (key === 'ArrowLeft') {
                this.movingDirection.push('left');
                this.directionHorizontal = -1;
            } else if (key === 'ArrowDown') {
                this.movingDirection.push('down');
                this.directionVertical = 1;
            } else if (key === 'ArrowUp') {
                this.movingDirection.push('up');
                this.directionVertical = -1;
            }
            else if (key == 'Shift') {
                this.isRunning = true;
            }
        };

        this.handleKeyUp = (e) => {
            const key = e.key;
            if (key === 'ArrowRight') {
                this.movingDirection = this.movingDirection.filter(k => k !== 'right');
            } else if (key === 'ArrowLeft') {
                this.movingDirection = this.movingDirection.filter(k => k !== 'left');
            } else if (key === 'ArrowDown') {
                this.movingDirection = this.movingDirection.filter(k => k !== 'down');
            } else if (key === 'ArrowUp') {
                this.movingDirection = this.movingDirection.filter(k => k !== 'up');
            }
            else if (key == 'Shift') {
                this.isRunning = false;
            }
        };

        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
    }

    destroy() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
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

    update(collisionMap) {
        let vx = 0;
        let vy = 0;
        let nextAnim = '';

        // Determinar velocidade baseada no input

        const isRight = this.movingDirection.includes('right');
        const isLeft = this.movingDirection.includes('left');
        const isUp = this.movingDirection.includes('up');
        const isDown = this.movingDirection.includes('down');

        if (isLeft && !isRight) vx = -CHARACTER_SPEED;
        if (isRight && !isLeft) vx = CHARACTER_SPEED;
        if (isUp && !isDown) vy = -CHARACTER_SPEED;
        if (isDown && !isUp) vy = CHARACTER_SPEED;

        // Normalizar velocidade na diagonal
        if (vx !== 0 && vy !== 0) {
            const factor = 1 / Math.sqrt(2);
            vx *= factor;
            vy *= factor;
        }

        // --- SISTEMA DE ENERGIA ---
        const isMoving = vx !== 0 || vy !== 0;

        if (this.isRunning && isMoving) {
            this.energia -= 0.8; // Gasta energia ao correr
            if (this.energia <= 0) {
                this.energia = 0;
                this.isRunning = false; // Acabou o fôlego, para de correr
            }
        } else {
            // Recupera energia se estiver andando ou parado
            if (this.energia < 100) {
                this.energia += 0.4; // Recupera mais devagar que gasta
                if (this.energia > 100) this.energia = 100;
            }
        }

        // Aplica velocidade de corrida (apenas se tiver energia)
        if (this.isRunning && this.energia > 0) {
            if (isRight || isLeft) vx *= 1.6;
            if (isDown || isUp) vy *= 1.6;
        }

        // Determinar animação e atualizar última direção
        if (vx > 0) { nextAnim = 'right'; this.lastDirection = 'right'; }
        else if (vx < 0) { nextAnim = 'left'; this.lastDirection = 'left'; }
        else if (vy > 0) { nextAnim = 'down'; this.lastDirection = 'down'; }
        else if (vy < 0) { nextAnim = 'up'; this.lastDirection = 'up'; }

        // Se parado, usar idle da última direção
        if (vx === 0 && vy === 0) {
            nextAnim = 'idle_' + this.lastDirection;
        }

        if (vx !== 0 || vy !== 0) {
            const nextX = this.x + vx;
            const nextY = this.y + vy;

            // Verificar colisão
            if (canMove(nextX, nextY, HERO_HITBOX_WIDTH, HERO_HITBOX_HEIGHT, collisionMap)) {
                this.x = nextX;
                this.y = nextY;
            } else {
                // Tenta deslizar (movimento eixo por eixo)
                if (vx !== 0 && canMove(this.x + vx, this.y, HERO_HITBOX_WIDTH, HERO_HITBOX_HEIGHT, collisionMap)) {
                    this.x += vx;
                }
                else if (vy !== 0 && canMove(this.x, this.y + vy, HERO_HITBOX_WIDTH, HERO_HITBOX_HEIGHT, collisionMap)) {
                    this.y += vy;
                }
            }
        }

        if (this.currentAnim !== nextAnim) {
            this.currentAnim = nextAnim;
            this.sprite.textures = this.animations[nextAnim];
            this.sprite.play();
        }

        this.updateSpritePosition();
    }

    updateSpritePosition() {
        this.sprite.x = this.x + 25; // Centro da hitbox (50/2)
        this.sprite.y = this.y + 100; // Base da hitbox (100)
    }

    getSprite() { return this.sprite; }
}