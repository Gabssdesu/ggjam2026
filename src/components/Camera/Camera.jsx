import { useRef } from 'react'
import { extend, useTick } from '@pixi/react'
import { Container } from 'pixi.js'
import { TILE_SIZE, ZOOM } from '../../constants/game-world'

extend({ Container })

const lerp = (start, end) => {
  return start + (end - start) * 0.03
}

export const Camera = ({ heroPosition, canvasSize, children }) => {
  const containerRef = useRef(null)

  const cameraPosition = useRef({
    x: canvasSize.width / 2,
    y: canvasSize.height / 2,
  })

  useTick(() => {
    if (containerRef.current) {
      const targetX =
        canvasSize.width / 2 - heroPosition.x * TILE_SIZE * ZOOM - TILE_SIZE
      const targetY =
        canvasSize.height / 2 - heroPosition.y * TILE_SIZE * ZOOM - TILE_SIZE

      cameraPosition.current.x = lerp(cameraPosition.current.x, targetX)
      cameraPosition.current.y = lerp(cameraPosition.current.y, targetY)

      containerRef.current.x = cameraPosition.current.x
      containerRef.current.y = cameraPosition.current.y
    }
  })

  return (
    <container ref={containerRef} scale={ZOOM}>
      {children}
    </container>
  )
}