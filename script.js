import { Game } from "./Game.js"

const startButton = document.getElementById('start')
const modeButton = document.getElementById('mode')

const game = new Game()

startButton.onclick = () => game.initGame(modeButton.textContent.substring(6))
modeButton.onclick = () => {
  const modes = {
    'Normal': 'Sudden Death',
    'Sudden Death': 'Normal'
  }

  /**
   * Toggling modes - using .substring() to replace the substring after 'Mode: '.
   */
  const currentMode = modeButton.textContent.substring(6)
  modeButton.textContent = modeButton.textContent.substring(0, 6) + modes[currentMode]
}
