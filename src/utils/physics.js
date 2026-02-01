import { TILE_SIZE } from '../constants/game-world';

/**
 * Verifica colisão de um retângulo com o mapa de tiles
 * @param {number} newX - Posição X desejada (top-left)
 * @param {number} newY - Posição Y desejada (top-left)
 * @param {number} width - Largura da hitbox
 * @param {number} height - Altura da hitbox
 * @param {Array} collisionMap - Matriz de colisão do mapa atual
 * @returns {boolean} - true se NÃO houver colisão (pode mover), false se houver
 */
export const canMove = (newX, newY, width, height, collisionMap) => {
    // Offset pequeno para evitar colisão com tiles adjacentes
    // quando se está perfeitamente alinhado
    const offset = 1;

    // Check all tiles that overlap with the hitbox
    const startCol = Math.floor((newX + offset) / TILE_SIZE);
    const endCol = Math.floor((newX + width - offset) / TILE_SIZE);
    const startRow = Math.floor((newY + offset) / TILE_SIZE);
    const endRow = Math.floor((newY + height - offset) / TILE_SIZE);

    for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
            if (collisionMap?.[row]?.[col] === 1) {
                return false; // Collision detected
            }
        }
    }

    return true; // Safe to move
};
