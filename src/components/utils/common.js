import { COLLISION_MAP } from '../../constants/colision-map'
import { COLS, TILE_SIZE } from '../../constants/game-world'

export const calculateCanvasSize = () => {
  const baseWidth = 1280 // Largura base do jogo
  const baseHeight = 720 // Altura base do jogo
  
  const width = window.innerWidth
  const height = window.innerHeight
  
  // Calcular escala mantendo proporção (aspect ratio)
  const scaleX = width / baseWidth
  const scaleY = height / baseHeight
  const scale = Math.min(scaleX, scaleY)
  
  return {
    width: width, // Usar largura completa da tela
    height: height, // Usar altura completa da tela
    baseWidth: baseWidth,
    baseHeight: baseHeight,
    scale: scale // Scale para zoom do jogo
  }
}

export const calculateNewTarget = (x, y, direction) => {
  return {
    x:
      (x / TILE_SIZE) * TILE_SIZE +
      (direction === 'LEFT'
        ? -TILE_SIZE
        : direction === 'RIGHT'
        ? TILE_SIZE
        : 0),
    y:
      (y / TILE_SIZE) * TILE_SIZE +
      (direction === 'UP' ? -TILE_SIZE : direction === 'DOWN' ? TILE_SIZE : 0),
  }
}

export const checkCanMove = (target) => {
  const row = Math.floor(target.y / TILE_SIZE)
  const col = Math.floor(target.x / TILE_SIZE)
  const index = COLS * row + col

  if (index < 0 || index >= COLLISION_MAP.length) {
    return false
  }

  return COLLISION_MAP[index] !== 1
}

export const moveTowards = (current, target, maxStep) => {
  return (
    current +
    Math.sign(target - current) * Math.min(Math.abs(target - current), maxStep)
  )
}

export const continueMovement = (currentPosition, targetPosition, step) => {
  return {
    x: moveTowards(currentPosition.x, targetPosition.x, step),
    y: moveTowards(currentPosition.y, targetPosition.y, step),
  }
}

export const handleMovement = (
  currentPosition,
  targetPosition,
  moveSpeed,
  delta
) => {
  const step = moveSpeed * TILE_SIZE * delta
  const distance = Math.hypot(
    targetPosition.x - currentPosition.x,
    targetPosition.y - currentPosition.y
  )

  if (distance <= step) {
    return {
      position: targetPosition,
      completed: true,
    }
  }

  return {
    position: continueMovement(currentPosition, targetPosition, step),
    completed: false,
  }
}