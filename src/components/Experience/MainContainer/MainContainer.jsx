import { useState, useMemo, useCallback } from 'react'
import { Texture } from 'pixi.js'
import { Container, Sprite } from '@pixi/react'
import { TILE_SIZE } from '../../../constants/game-world'
import { Hero } from '../../Hero/Hero'
import { Level } from '../../Levels/Level'
import { Camera } from '../../Camera/Camera'
import backgroundAsset from '@/assets/grass.png'
import heroAsset from '@/assets/hero.png'

export const MainContainer = ({ canvasSize, children }) => {
  const [heroPosition, setHeroPosition] = useState({ x: 0, y: 0 })

  const updateHeroPosition = useCallback((x, y) => {
    setHeroPosition({
      x: Math.floor(x / TILE_SIZE),
      y: Math.floor(y / TILE_SIZE),
    })
  }, [])

  const heroTexture = useMemo(() => Texture.from(heroAsset), [])
  const backgroundTexture = useMemo(() => Texture.from(backgroundAsset), [])

  return (
    <Container>
      <Sprite
        texture={backgroundTexture}
        width={canvasSize.width}
        height={canvasSize.height}
      />
      {children}
      <Camera heroPosition={heroPosition} canvasSize={canvasSize}>
        <Level />
        <Hero texture={heroTexture} onMove={updateHeroPosition} />
      </Camera>
    </Container>
  )
}

export default MainContainer