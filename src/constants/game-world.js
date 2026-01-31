export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// O mapa tem 28 colunas e 21 linhas (800x600 4:3)
export const MAP_COLS = 28;
export const MAP_ROWS = 21;

export const TILE_SIZE = CANVAS_WIDTH / MAP_COLS; // ~28.57px

export const CHARACTER_SPEED = 4;

// Dimensões da hitbox do personagem
export const HERO_HITBOX_WIDTH = 50;
export const HERO_HITBOX_HEIGHT = 100;

// Dimensões visuais do personagem (para compensar transparência)
export const HERO_SPRITE_WIDTH = 120;
export const HERO_SPRITE_HEIGHT = 140;

// Configuração inicial
export const INITIAL_PLAYER_X = 100;
export const INITIAL_PLAYER_Y = 400;