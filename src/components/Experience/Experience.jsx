import { Application } from '@pixi/react'
import { useCallback, useState, useEffect } from 'react'
import { calculateCanvasSize } from '../utils/common.js'
import { MainContainer } from './MainContainer/MainContainer'

export const Main = () => {
  const [canvasSize, setCanvasSize] = useState(calculateCanvasSize)

  const updateCanvasSize = useCallback(() => {
    setCanvasSize(calculateCanvasSize())
  }, [])

  useEffect(() => {
    window.addEventListener('resize', updateCanvasSize)
    // Atualizar também quando a orientação mudar (mobile)
    window.addEventListener('orientationchange', updateCanvasSize)
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize)
      window.removeEventListener('orientationchange', updateCanvasSize)
    }
  }, [updateCanvasSize])

  return (
    <Application 
      width={canvasSize.width} 
      height={canvasSize.height} 
      resolution={1} // Usar resolution 1 para melhor performance
      options={{ resolution: 1, autoDensity: false }}
    >
      <MainContainer canvasSize={canvasSize} />
    </Application>
  )
}
