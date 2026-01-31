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
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [updateCanvasSize])

  return (
    <Application width={canvasSize.width} height={canvasSize.height}>
      <MainContainer canvasSize={canvasSize} />
    </Application>
  )
}
