import { useState, useCallback, useEffect } from 'react'
import { extend } from '@pixi/react'
import { Container, Sprite, Assets } from 'pixi.js'
import { TILE_SIZE } from '../../../constants/game-world'
import { Hero } from '../../Hero/Hero'
import { Level } from '../../Levels/Level'
import { Camera } from '../../Camera/Camera' 
import backgroundAsset from '../../../assets/grass.webp'
import heroAsset from '../../../assets/heroina.png'

// Registrar componentes Pixi para uso em JSX
extend({ Container, Sprite })

export const MainContainer = ({ canvasSize, children }) => {
  const [heroPosition, setHeroPosition] = useState({ x: 0, y: 0 })
  const [heroTexture, setHeroTexture] = useState(null)
  const [backgroundTexture, setBackgroundTexture] = useState(null)

  // Carregar texturas quando o componente monta
  useEffect(() => {
    const loadTextures = async () => {
      try {
        // Carregar as imagens diretamente como texturas
        const heroTex = await Assets.load(heroAsset)
        const bgTex = await Assets.load(backgroundAsset)
        
        setHeroTexture(heroTex)
        setBackgroundTexture(bgTex)
      } catch (error) {
        console.error('Erro ao carregar texturas:', error)
      }
    }
    
    loadTextures()
  }, [])

  const updateHeroPosition = useCallback((x, y) => {
    setHeroPosition({
      x: Math.floor(x / TILE_SIZE),
      y: Math.floor(y / TILE_SIZE),
    })
  }, [])

  return (
    <container>
      {backgroundTexture && (
        <sprite
          texture={backgroundTexture}
          width={canvasSize.width}
          height={canvasSize.height}
        />
      )}
      {children}
      {heroTexture && (
        <Camera heroPosition={heroPosition} canvasSize={canvasSize}>
          <Level />
          <Hero texture={heroTexture} onMove={updateHeroPosition} />
        </Camera>
      )}
    </container>
  )
}

export default MainContainer