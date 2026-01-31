import { Container } from '@pixi/react'

// TODO: Adicionar tilemap.png em src/assets/ e descomentar o código abaixo
// import { GAME_HEIGHT, GAME_WIDTH, OFFSET_X, OFFSET_Y } from '../../constants/game-world'
// import { Sprite } from '@pixi/react'
// import levelAsset from '../../assets/tilemap.png'

export const Level = () => {
  // Placeholder até tilemap.png ser adicionado
  return <Container />
  
  // Descomentar quando tilemap.png existir:
  // return (
  //   <Sprite
  //     image={levelAsset}
  //     width={GAME_WIDTH}
  //     height={GAME_HEIGHT + OFFSET_Y}
  //     scale={1}
  //     x={OFFSET_X}
  //     y={OFFSET_Y}
  //   />
  // )
}