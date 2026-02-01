import React, { useEffect, useRef, useState } from 'react';
import { Application, Sprite, Assets, Graphics, Container, Text, Texture, Rectangle } from 'pixi.js';
import { Heart } from 'lucide-react';
import loiraImage from '../../assets/heroina.png';
import loiraMascaraImage from '../../assets/loira-com-mascara.png';
import mascaraItemImage from '../../assets/mascara-de-combate2.png';
import { Hero } from '../Hero/Hero.jsx';
import { Enemy } from '../Enemy/Enemy.jsx';
import { Projectile } from '../Projectile/Projectile.js';
import inimigoImage from '../../assets/inimigo.png';
import devil1Sound from '../../assets/Devil1.m4a';
import devil2Sound from '../../assets/Devil2.m4a';
import inimigoVerdeImage from '../../assets/inimigo-verde.png';
import healPotionImage from '../../assets/heal_potion.png';
import MAPS from '../../constants/maps.js';
import {
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    INITIAL_PLAYER_X,
    INITIAL_PLAYER_Y,
    HERO_HITBOX_WIDTH,
    HERO_HITBOX_HEIGHT,
    ENEMY_HITBOX_WIDTH,
    ENEMY_HITBOX_HEIGHT,
    TILE_SIZE
} from '../../constants/game-world';

export default function Game() {
    const canvasRef = useRef(null);
    const appRef = useRef(null);
    const heroRef = useRef(null);
    const enemiesRef = useRef([]); // Array para múltiplos inimigos
    const projectilesRef = useRef([]); // Array para projéteis
    const maskItemRef = useRef(null); // Ref para o item da máscara
    const musicRef = useRef(null); // Referência para o áudio
    const loadMapFuncRef = useRef(null);
    const currentMapRef = useRef('ENTRADA');

    const staminaRef = useRef(null);
    const ammoRef = useRef(null); // Ref para texto de munição
    const healthPotionsRef = useRef([]); // Array para poções de vida dropadas
    const deadEnemiesRef = useRef(new Set()); // Set para armazenar IDs de inimigos mortos
    const texturesRef = useRef({ normal: null, weapon: null }); // Armazena texturas para troca

    const [health, setHealth] = useState(3);
    const [gameOver, setGameOver] = useState(false);
    const gameOverRef = useRef(false);

    // Sincronizar ref com state
    useEffect(() => {
        gameOverRef.current = gameOver;
    }, [gameOver]);

    const [dialog, setDialog] = useState({ open: false, text: '' }); // Estado do Dialog

    const checkCollision = (r1, r2) => {
        const hit = r1.x < r2.x + r2.width &&
            r1.x + r1.width > r2.x &&
            r1.y < r2.y + r2.height &&
            r1.y + r1.height > r2.y;

        return hit;
    };



    useEffect(() => {
        let destroyed = false;
        let app;
        let ambientSoundTimeout;

        const playAmbientSound = () => {
            if (destroyed || gameOverRef.current) {
                // Se o jogo acabou, tenta agendar de novo para quando o jogo reiniciar
                // ou apenas para se destruído
                if (!destroyed) {
                    ambientSoundTimeout = setTimeout(playAmbientSound, 5000);
                }
                return;
            }

            const sounds = [devil1Sound, devil2Sound];
            const randomSound = sounds[Math.floor(Math.random() * sounds.length)];

            const audio = new Audio(randomSound);
            audio.volume = 0.3; // Volume mais baixo para ser um susto sutil
            audio.play();

            // Agenda o próximo som entre 15 e 45 segundos
            const nextTime = Math.random() * 10000 + 15000;
            ambientSoundTimeout = setTimeout(playAmbientSound, nextTime);
        };

        // Inicia o ciclo de sons ambientes após 10 segundos
        ambientSoundTimeout = setTimeout(playAmbientSound, 10000);

        const setup = async () => {
            if (canvasRef.current) {
                Array.from(canvasRef.current.childNodes).forEach(node => {
                    if (node.nodeName === 'CANVAS') {
                        canvasRef.current.removeChild(node);
                    }
                });
            }

            // Inicializar Pixi
            app = new Application();
            await app.init({
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                backgroundColor: 0x87ceeb,
                backgroundAlpha: 1
            });
            appRef.current = app;

            if (canvasRef.current && !destroyed) {
                canvasRef.current.appendChild(app.canvas);
            }

            // Camada de Debug
            // Camadas (Containers) para organizar o Z-Index
            const mapLayer = new Container();
            const gameLayer = new Container();
            app.stage.addChild(mapLayer);
            app.stage.addChild(gameLayer);

            const loadMap = async (mapId, spawnX, spawnY) => {
                const config = MAPS[mapId];
                if (!config) return;



                // Limpar camada do mapa
                mapLayer.removeChildren();

                // Limpar poções de vida ao mudar de mapa
                healthPotionsRef.current.forEach(potion => potion.destroy());
                healthPotionsRef.current = [];

                // Limpar máscara anterior (se houver)
                if (maskItemRef.current) {
                    maskItemRef.current.destroy();
                    maskItemRef.current = null;
                }

                // Carregar e adicionar novo mapa
                const mapaTexture = await Assets.load(config.asset);
                const mapa = new Sprite(mapaTexture);
                mapa.width = CANVAS_WIDTH;
                mapa.height = CANVAS_HEIGHT;

                mapLayer.addChild(mapa);
                currentMapRef.current = mapId;

                // Reposicionar Herói
                if (heroRef.current) {
                    heroRef.current.x = spawnX;
                    heroRef.current.y = spawnY;
                    heroRef.current.updateSpritePosition();
                }

                // Gerenciar Música
                if (config.music) {
                    // Se já existir música checa se é a mesma
                    if (musicRef.current && musicRef.current._sourceId === config.music) {
                        // É a mesma música, deixa tocando
                    } else {
                        // Música diferente ou nenhuma tocando
                        if (musicRef.current) {
                            musicRef.current.pause();
                        }

                        // Cria e toca a nova música
                        const nextMusic = new Audio(config.music);
                        nextMusic.loop = true;
                        nextMusic.volume = 0.5;
                        nextMusic._sourceId = config.music; // Identificador customizado para comparação confiável

                        // Tentar tocar
                        nextMusic.play().catch(e => console.error("Erro ao tocar música:", e));

                        musicRef.current = nextMusic;
                    }
                } else if (musicRef.current) {
                    // Mapa sem música
                    musicRef.current.pause();
                    musicRef.current = null;
                }

                // Gerar inimigos do mapa - sempre respawna
                enemiesRef.current.forEach(e => e.destroy());
                enemiesRef.current = [];

                if (config.spawnEnemies) {
                    const enemyTex = await Assets.load(inimigoImage);
                    const enemyRosaTex = await Assets.load(inimigoVerdeImage);

                    // VERIFICAÇÃO DE SEGURANÇA: Se o jogo foi encerrado ou mudou de mapa durante o load async
                    if (destroyed || currentMapRef.current !== mapId) return;

                    // Cria todos os inimigos do mapa
                    config.spawnEnemies.forEach((spawn, index) => {
                        const enemyId = `${mapId}-enemy-${index}`;

                        // Se o inimigo já foi morto, não respawna
                        if (deadEnemiesRef.current.has(enemyId)) return;

                        // Sorteio do tipo (0: normal, 1: rosa)
                        // 50% de chance para cada
                        const isRosa = Math.random() > 0.5;
                        const texture = isRosa ? enemyRosaTex : enemyTex;

                        // Converter grade para pixels
                        const spawnX = spawn.col * TILE_SIZE;
                        const spawnY = spawn.row * TILE_SIZE;

                        const enemy = new Enemy(texture, spawnX, spawnY);
                        enemy.id = enemyId; // Atribui ID ao inimigo

                        gameLayer.addChild(enemy.getSprite());
                        enemiesRef.current.push(enemy);
                    });
                }

                // Spawnar Máscara se estiver no BEDROOM e ainda não tiver pego
                if (mapId === 'BEDROOM' && !hero.hasWeapon && texturesRef.current.weapon) {
                    const maskContainer = new Container();
                    maskContainer.x = 415;
                    maskContainer.y = 315;

                    // 1. Aura/Glow (Círculo Amarelo Ajustado)
                    const glow = new Graphics();
                    glow.circle(0, 0, 30);
                    glow.fill({ color: 0xFFD700, alpha: 0.4 });
                    glow.stroke({ color: 0xFFFFFF, width: 2, alpha: 0.8 });
                    maskContainer.addChild(glow);

                    // 2. Sprite da Máscara (NOVO ASSET DIRETO)
                    const maskItemTex = await Assets.load(mascaraItemImage);
                    const maskSprite = new Sprite(maskItemTex);

                    // SCALE: Ajustar para caber no círculo (60px)
                    const maxDim = Math.max(maskItemTex.width, maskItemTex.height);
                    const scale = 50 / maxDim; // Alvo: 50px visual
                    maskSprite.scale.set(scale);

                    maskSprite.anchor.set(0.5);
                    // Centralizado (sem offsets malucos agora que é o sprite certo)
                    maskSprite.x = 0;
                    maskSprite.y = 0;

                    maskContainer.addChild(maskSprite);

                    gameLayer.addChild(maskContainer);
                    maskItemRef.current = maskContainer;
                }


            };
            loadMapFuncRef.current = loadMap;


            const heroTex = await Assets.load(loiraImage);
            const heroMaskTex = await Assets.load(loiraMascaraImage);

            // Salvar refs para restart
            texturesRef.current = { normal: heroTex, weapon: heroMaskTex };

            const hero = new Hero(heroTex, INITIAL_PLAYER_X, INITIAL_PLAYER_Y);

            // Pré-carregar textura da poção
            const healPotionTex = await Assets.load(healPotionImage);

            // Função para dropar poção de vida
            const dropHealthPotion = (x, y) => {
                const potion = new Sprite(healPotionTex);
                potion.anchor.set(0.5, 1); // Centralizado horizontalmente, base nos pés
                potion.width = 50;
                potion.height = 50;
                potion.x = x;
                potion.y = y;
                gameLayer.addChild(potion);
                healthPotionsRef.current.push(potion);
            };

            // Configurar callback do tiro
            hero.onShoot = (x, y, dir) => {
                const projectile = new Projectile(x, y, dir);
                gameLayer.addChild(projectile.sprite); // Adiciona na gameLayer
                projectilesRef.current.push(projectile);
            };

            gameLayer.addChild(hero.getSprite()); // Adiciona na gameLayer
            heroRef.current = hero;

            await loadMap('ENTRADA', INITIAL_PLAYER_X, INITIAL_PLAYER_Y);

            app.ticker.add(() => {
                if (destroyed || (heroRef.current && heroRef.current.vida <= 0)) return;



                const currentMapConfig = MAPS[currentMapRef.current];
                hero.update(currentMapConfig?.collisionMap);

                // Atualizar UI
                if (staminaRef.current) {
                    staminaRef.current.style.width = `${hero.energia}%`;
                }
                if (ammoRef.current) {
                    ammoRef.current.innerText = hero.hasWeapon ? `${hero.ammo} / ${hero.maxAmmo}` : '';
                }

                enemiesRef.current.forEach(enemy => {
                    enemy.update(currentMapConfig?.collisionMap, hero);
                });

                // Atualizar Projéteis
                for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
                    const p = projectilesRef.current[i];
                    p.update();

                    // Remover se sair da tela ou colidir com parede (simples)
                    if (p.x < 0 || p.x > CANVAS_WIDTH || p.y < 0 || p.y > CANVAS_HEIGHT) {
                        p.destroy();
                        projectilesRef.current.splice(i, 1);
                        continue;
                    }

                    // Colisão Projétil x Inimigo
                    const pRect = p.getBounds();
                    let projectileHit = false;

                    for (let j = enemiesRef.current.length - 1; j >= 0; j--) {
                        const enemy = enemiesRef.current[j];

                        // Hitbox de DANO do inimigo (VISUAL)
                        const ENEMY_DAMAGE_HEIGHT = 120;
                        const damageRect = {
                            x: enemy.x,
                            y: enemy.y - ENEMY_DAMAGE_HEIGHT, // Sobe da base
                            width: ENEMY_HITBOX_WIDTH,
                            height: ENEMY_DAMAGE_HEIGHT
                        };

                        if (checkCollision(pRect, damageRect)) {
                            // Dropar poção de vida na posição do inimigo
                            dropHealthPotion(enemy.x, enemy.y);

                            // Registrar morte
                            if (enemy.id) {
                                deadEnemiesRef.current.add(enemy.id);
                            }

                            // Matar Inimigo
                            enemy.destroy();
                            enemiesRef.current.splice(j, 1);

                            // Destruir Projétil
                            p.destroy();
                            projectilesRef.current.splice(i, 1);
                            projectileHit = true;
                            break; // Sai do loop de inimigos pois o projétil já foi destruído
                        }
                    }

                    // Se o projétil foi destruído por colisão, continua para o próximo projétil
                    if (projectileHit) continue;
                }

                if (hero.x < 0) hero.x = 0;
                if (hero.y < HERO_HITBOX_HEIGHT) hero.y = HERO_HITBOX_HEIGHT; // Y é a base, mínimo é a altura
                if (hero.x > CANVAS_WIDTH - HERO_HITBOX_WIDTH) hero.x = CANVAS_WIDTH - HERO_HITBOX_WIDTH;
                if (hero.y > CANVAS_HEIGHT) hero.y = CANVAS_HEIGHT; // Y é a base, pode ir até a borda inferior

                // Checar item da máscara
                if (maskItemRef.current && !hero.hasWeapon) {
                    // Animação de pulso
                    const pulse = 1 + Math.sin(Date.now() / 200) * 0.1;
                    maskItemRef.current.scale.set(pulse);

                    const heroRect = { x: hero.x, y: hero.y - HERO_HITBOX_HEIGHT, width: HERO_HITBOX_WIDTH, height: HERO_HITBOX_HEIGHT };
                    // Ajuste da hitbox da máscara para centralizada
                    const maskRect = {
                        x: maskItemRef.current.x - 20,
                        y: maskItemRef.current.y - 20,
                        width: 40,
                        height: 40
                    };

                    if (checkCollision(heroRect, maskRect)) {
                        hero.equipWeapon(texturesRef.current.weapon); // Equipa nova textura
                        hero.addAmmo(5); // Dá 5 munições ao pegar

                        // Remover visualmente e da memória
                        maskItemRef.current.destroy();
                        maskItemRef.current = null;

                        setDialog({
                            open: true,
                            text: 'MÁSCARA OBTIDA!\nVocê encontrou uma arma antiga.\nPressione Z para atirar.'
                        });
                        setTimeout(() => setDialog({ open: false, text: '' }), 4000); // Fecha auto em 4s
                    }
                }

                // Checar coleta de poções de vida
                const heroRect = { x: hero.x, y: hero.y - HERO_HITBOX_HEIGHT, width: HERO_HITBOX_WIDTH, height: HERO_HITBOX_HEIGHT };
                for (let i = healthPotionsRef.current.length - 1; i >= 0; i--) {
                    const potion = healthPotionsRef.current[i];
                    const potionRect = { x: potion.x - 25, y: potion.y - 50, width: 50, height: 50 }; // Centralizado e acima da base

                    if (checkCollision(heroRect, potionRect)) {
                        // Curar meio coração (0.5 de vida), máximo 3
                        if (hero.vida < 3) {
                            hero.vida = Math.min(3, hero.vida + 0.5);
                            setHealth(hero.vida);

                            // Remover poção
                            potion.destroy();
                            healthPotionsRef.current.splice(i, 1);
                        }
                    }
                }

                // Colisão com Inimigos
                enemiesRef.current.forEach(enemy => {
                    const heroRect = {
                        x: hero.x,
                        y: hero.y - HERO_HITBOX_HEIGHT, // Y é a base, sobe para cima
                        width: HERO_HITBOX_WIDTH,
                        height: HERO_HITBOX_HEIGHT
                    };
                    const enemyRect = {
                        x: enemy.x,
                        y: enemy.y - ENEMY_HITBOX_HEIGHT, // Y é a base, sobe para cima
                        width: ENEMY_HITBOX_WIDTH,
                        height: ENEMY_HITBOX_HEIGHT
                    };



                    if (checkCollision(heroRect, enemyRect)) {
                        hero.takeDamage();
                        setHealth(hero.vida);
                        if (hero.vida <= 0) {
                            setGameOver(true);
                        }
                    }
                });

                hero.updateSpritePosition();

                if (currentMapConfig?.doors) {
                    const heroRect = {
                        x: hero.x,
                        y: hero.y - HERO_HITBOX_HEIGHT, // Y é a base, sobe para cima
                        width: HERO_HITBOX_WIDTH,
                        height: HERO_HITBOX_HEIGHT
                    };

                    for (const door of currentMapConfig.doors) {
                        const doorRect = {
                            x: door.col * TILE_SIZE,
                            y: door.row * TILE_SIZE,
                            width: (door.w || 1) * TILE_SIZE,
                            height: (door.h || 1) * TILE_SIZE
                        };

                        if (checkCollision(heroRect, doorRect)) {
                            let targetX = door.spawnX;
                            let targetY = door.spawnY;

                            if (door.spawnCol !== undefined && door.spawnRow !== undefined) {
                                targetX = door.spawnCol * TILE_SIZE;
                                targetY = door.spawnRow * TILE_SIZE;
                            }

                            loadMap(door.targetMap, targetX, targetY);
                            break;
                        }
                    }
                }
            });
        };

        setup();

        return () => {
            destroyed = true;
            if (heroRef.current) {
                heroRef.current.destroy();
            }
            enemiesRef.current.forEach(e => e.destroy());
            healthPotionsRef.current.forEach(potion => potion.destroy());
            if (musicRef.current) {
                musicRef.current.pause();
                musicRef.current = null;
            }
            if (ambientSoundTimeout) {
                clearTimeout(ambientSoundTimeout);
            }
            if (appRef.current) {
                appRef.current.destroy(true, { children: true });
                appRef.current = null;
            }
            if (canvasRef.current) {
                Array.from(canvasRef.current.childNodes).forEach(node => {
                    if (node.nodeName === 'CANVAS') {
                        canvasRef.current.removeChild(node);
                    }
                });
            }
        };
    }, []);





    const restartGame = () => {
        if (heroRef.current) {
            heroRef.current.vida = 3;
            heroRef.current.energia = 100;
            heroRef.current.x = INITIAL_PLAYER_X;
            heroRef.current.y = INITIAL_PLAYER_Y;
            heroRef.current.isInvincible = false;
            heroRef.current.sprite.tint = 0xffffff;
            heroRef.current.sprite.alpha = 1;
            heroRef.current.ammo = heroRef.current.maxAmmo;

            // Reverter para textura normal
            if (texturesRef.current.normal) {
                heroRef.current.equipWeapon(texturesRef.current.normal);
                heroRef.current.hasWeapon = false; // equipWeapon seta true, forçamos false
            }
        }
        setHealth(3);
        setGameOver(false);

        if (loadMapFuncRef.current) {
            loadMapFuncRef.current('ENTRADA', INITIAL_PLAYER_X, INITIAL_PLAYER_Y);
        }

        // Limpar registro de mortos ao reiniciar o jogo
        deadEnemiesRef.current.clear();
    };

    useEffect(() => {
        const handleAnyKey = (e) => {
            if (dialog.open) {
                // Ignorar teclas de controle do personagem
                const controlKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', 'z', 'Z', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D'];
                if (controlKeys.includes(e.key)) {
                    return; // Não fecha o diálogo
                }
                setDialog({ ...dialog, open: false });
            }
        };
        window.addEventListener('keydown', handleAnyKey);
        return () => window.removeEventListener('keydown', handleAnyKey);
    }, [dialog.open]);

    // Listener para iniciar áudio na primeira interação (Autoplay Policy)
    useEffect(() => {
        const startAudio = () => {
            if (musicRef.current && musicRef.current.paused) {
                musicRef.current.play().catch(e => console.error("Erro ao retomar música:", e));
            }
        };

        window.addEventListener('keydown', startAudio);
        window.addEventListener('click', startAudio);

        return () => {
            window.removeEventListener('keydown', startAudio);
            window.removeEventListener('click', startAudio);
        };
    }, []);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#050510',
            height: '100vh',
            width: '100vw',
            overflow: 'hidden',
            fontFamily: 'monospace'
        }}>

            {/* CONTAINER DO JOGO COM BORDA RETRO */}
            <div style={{
                position: 'relative',
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                // Borda estilo moldura retrô
                border: '8px solid rgb(59, 59, 59)',
                outline: '4px solid rgb(30, 30, 30)',
                boxShadow: '0 0 50px rgba(0,0,0,0.8)',
                backgroundColor: '#000'
            }}>

                {/* CAMADA CANVAS */}
                <div ref={canvasRef} style={{ width: '100%', height: '100%' }} />

                {/* HUD OVERLAY - Usando Lucide Icons */}
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    zIndex: 10,
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    filter: 'drop-shadow(2px 2px 0 rgba(0,0,0,0.8))'
                }}>

                    {/* HEARTS ROW */}
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center'
                    }}>
                        {[...Array(3)].map((_, i) => (
                            <Heart
                                key={i}
                                size={32}
                                fill={i < health ? "#e74c3c" : "transparent"}
                                color={i < health ? "#fff" : "#333"}
                                strokeWidth={2}
                                style={{
                                    opacity: i < health ? 1 : 0.3,
                                    transition: 'all 0.3s ease'
                                }}
                            />
                        ))}
                    </div>

                    {/* STAMINA BAR CONTAINER */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                    }}>
                        <div style={{
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            textShadow: '2px 2px 0 #000',
                            letterSpacing: '2px',
                            marginLeft: '2px'
                        }}>STAMINA</div>

                        {/* THE BAR FRAME */}
                        <div style={{
                            width: '240px',
                            height: '24px',
                            backgroundColor: '#2d3436', // Dark frame bg
                            border: '4px solid #fff', // Borda Branca Grossa
                            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8), 4px 4px 0 #000', // Sombra externa dura
                            position: 'relative',
                            padding: '2px'
                        }}>
                            {/* PREENCHIMENTO DA BARRA */}
                            <div ref={staminaRef} style={{
                                width: '100%',
                                height: '100%',
                                backgroundColor: '#f1c40f',
                                backgroundImage: `linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)`,
                                backgroundSize: '20px 20px',
                                boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.2), inset 0 2px 0 rgba(255,255,255,0.4)',
                                transition: 'width 0.1s linear'
                            }} />
                        </div>
                    </div>

                    {/* AMMO COUNTER */}
                    <div style={{
                        position: 'absolute',
                        top: '100px', left: '0px',
                        color: 'cyan',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        textShadow: '2px 2px 0 #000',
                        fontFamily: 'monospace'
                    }}>
                        <span ref={ammoRef}></span>
                    </div>

                </div>

                {/* DIALOG BOX OVERLAY */}
                {dialog.open && (
                    <div style={{
                        position: 'absolute',
                        bottom: '20px', left: '50%',
                        transform: 'translateX(-50%)',
                        width: '50%',
                        backgroundColor: 'rgba(0, 0, 100, 0.9)',
                        border: '4px solid #fff',
                        boxShadow: '0 0 10px #000, inset 0 0 20px #000',
                        padding: '10px',
                        zIndex: 50,
                        color: '#fff',
                        fontFamily: 'monospace',
                        fontSize: '18px',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-line'
                    }}>
                        {dialog.text}
                        <div style={{
                            fontSize: '12px',
                            textAlign: 'right',
                            marginTop: '10px',
                            color: '#aaa',
                            fontStyle: 'italic'
                        }}>
                            Pressione qualquer tecla para fechar...
                        </div>
                    </div>
                )}



                {/* GAME OVER OVERLAY */}
                {gameOver && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0,
                        width: '100%', height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        zIndex: 100,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        textAlign: 'center',
                        backdropFilter: 'blur(4px)'
                    }}>
                        <h1 style={{
                            fontSize: '64px',
                            marginBottom: '20px',
                            color: '#e74c3c',
                            textShadow: '4px 4px 0 #000',
                            letterSpacing: '8px'
                        }}>VOCÊ MORREU</h1>
                        <p style={{ fontSize: '18px', marginBottom: '40px', color: '#bdc3c7' }}>Os fantasmas te pegaram...</p>

                        <button
                            onClick={restartGame}
                            style={{
                                padding: '15px 40px',
                                fontSize: '24px',
                                backgroundColor: '#27ae60',
                                color: 'white',
                                border: '4px solid #fff',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                boxShadow: '4px 4px 0 #000',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'scale(1.1)'}
                            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                        >
                            TENTAR NOVAMENTE
                        </button>
                    </div>
                )}

            </div>

            <div style={{ marginTop: '16px', color: '#7f8c8d', fontSize: '12px' }}>
                GGJ 2026 PRE-ALPHA
            </div>
        </div >
    );
}
