import { useState, useRef } from 'react'
import { TILE_SIZE } from '../../constants/game-world'
import { Rectangle, Sprite, Texture } from 'pixi.js'

export const useHeroAnimation = ({
  texture,
  frameWidth,
  frameHeight,
  totalFrames,
  animationSpeed,
}) => {
  const [sprite, setSprite] = useState(null)
  const frameRef = useRef(0)
  const elapsedTimeRef = useRef(0)

  // Determina a linha do Spritesheet com base na direção
  const getRowByDirection = (direction) => {
    switch (direction) {
      case 'UP':
        return 8
      case 'LEFT':
        return 9
      case 'DOWN':
        return 10
      case 'RIGHT':
        return 11
      default:
        return 10
    }
  }

  // Cria uma nova textura cortando uma região específica (Rectangle) da textura original
  const createSprite = (row, column) => {
    if (!texture) {
      return null
    }
    
    const frame = new Texture({
      source: texture.source,
      frame: new Rectangle(
        column * frameWidth,
        row * frameHeight,
        frameWidth,
        frameHeight
      )
    })

    const newSprite = new Sprite(frame)
    newSprite.width = TILE_SIZE
    newSprite.height = TILE_SIZE

    return newSprite
  }

  const updateSprite = (direction, isMoving) => {
    const row = getRowByDirection(direction)
    let column = 0

    if (isMoving) {
      elapsedTimeRef.current += animationSpeed

      if (elapsedTimeRef.current >= 1) {
        elapsedTimeRef.current = 0
        frameRef.current = (frameRef.current + 1) % totalFrames
      }

      column = frameRef.current
    }

    const newSprite = createSprite(row, column)
    setSprite(newSprite)
  }

  return { sprite, updateSprite }
}