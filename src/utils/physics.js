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

    const corners = [
        { x: newX + offset, y: newY + offset },
        { x: newX + width - offset, y: newY + offset },
        { x: newX + offset, y: newY + height - offset },
        { x: newX + width - offset, y: newY + height - offset }
    ];

    for (let corner of corners) {
        const col = Math.floor(corner.x / TILE_SIZE);
        const row = Math.floor(corner.y / TILE_SIZE);

        if (collisionMap?.[row]?.[col] === 1) {
            return false; // Colidiu com obstáculo
        }
    }
    return true; // Pode se mover
};
