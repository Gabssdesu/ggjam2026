import { useRef, useCallback, useEffect, useState } from 'react'
import { extend, useTick } from '@pixi/react'
import { Container, Sprite } from 'pixi.js'
import {
  ANIMATION_SPEED,
  DEFAULT_X_POS,
  DEFAULT_Y_POS,
  MOVE_SPEED,
} from '../../constants/game-world'
import { useHeroControls } from './useHeroControls'
import {
  calculateNewTarget,
  checkCanMove,
  handleMovement,
} from '../utils/common.js'
import { useHeroAnimation } from './useHeroAnimation'

// Registrar componentes Pixi para uso em JSX
extend({ Container, Sprite })

export const Hero = ({ texture, onMove }) => {
  const [position, setPosition] = useState({ x: DEFAULT_X_POS, y: DEFAULT_Y_POS })
  const positionRef = useRef(position)
  const targetPosition = useRef(null)
  const currentDirection = useRef(null)
  const { getControlsDirection } = useHeroControls()
  const isMoving = useRef(false)

  const { sprite, updateSprite } = useHeroAnimation({
    texture,
    frameWidth: 64,
    frameHeight: 64,
    totalFrames: 9,
    animationSpeed: ANIMATION_SPEED,
  })

  useEffect(() => {
    positionRef.current = position
    onMove(position.x, position.y)
  }, [position, onMove])

  const setNextTarget = useCallback((direction) => {
    if (targetPosition.current) return

    const { x, y } = positionRef.current
    currentDirection.current = direction
    const newTarget = calculateNewTarget(x, y, direction)

    if (checkCanMove(newTarget)) {
      targetPosition.current = newTarget
    }
  }, [positionRef])

  useTick((delta) => {
    const direction = getControlsDirection()

    if (direction) {
      setNextTarget(direction)
    }

    if (targetPosition.current) {
      const { position: newPosition, completed } = handleMovement(
        positionRef.current,
        targetPosition.current,
        MOVE_SPEED,
        delta
      )

      positionRef.current = newPosition
      setPosition(newPosition)
      isMoving.current = true

      if (completed) {
        const { x, y } = newPosition
        onMove(x, y)

        targetPosition.current = null
        isMoving.current = false
      }
    }

    updateSprite(currentDirection.current, isMoving.current)
  })

  return (
    <container>
      {sprite && (
        <sprite
          texture={sprite.texture}
          x={position.x}
          y={position.y}
          scale={0.5}
          anchor={[0, 0.4]}
        />
      )}
    </container>
  )
}