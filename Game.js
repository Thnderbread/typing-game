import { words } from "./words.js"
import { Enemy } from "./Enemy.js"
import { Queue } from "./Queue.js"
import { collisionEvent } from "./collision.js"

/**
 * @typedef {Object} EnemyValueObject
 * @property {Enemy} enemy
 * @property {Number} detector - Interval that checks for collisions.
 * @property {HTMLParagraphElement} node - Ref to the HTML paragraph element node.
 */

export class Game {
  constructor() {
    /**
     * The game mode. Set in initGame fn.
     * 
     * @type {String}
     */
    this.gameMode = ""
    /**
     * The current difficulty level
     * 
     * @type {Number}
     */
    this.difficultyLevel = 0

    /**
     * The current amount of lives the user has set
     * in initGame fn. Starts at 4 for normal mode, 1
     * for sudden death.
     * 
     * @type {Number}
     */
    this.lives = undefined
    /**
     * Map holding all the enemies placed onto the game area.
     * @type {Map<String, EnemyValueObject>}
     */
    this.activeEnemies = new Map

    /**
     * Queue holding the next words to be added
     * to the game area.
     * 
     * @type {Queue}
     */
    this.enemyQueue = new Queue()

    /**
     * Delay before enemies are spawned in.
     * @type {Number}
     */
    this.enemySpawnDelay = 2500
    /**
     * Delay before the queue is loaded with
     * new words.
     * 
     * @type {Number}
     */
    this.loadQueueDelay = 10000
    /**
     * Delay before difficulty is increased.
     * 
     * @type {Number}
     */
    this.difficultyIncreaseDelay = 25000

    /**
     * Controls in what way the difficulty is
     * adjusted.
     * 
     * @type {String}
     */
    this.nextModifier = 'interval'

    /**
     * @type {Number}
     */
    this.score = 0
    /**
     * Streak built up by 1 every time a word
     * is cleared. Resets when a life is lost.
     * @type {Number}
     */
    this.streak = 0
    /**
     * High score from previous session. Stored in memory.
     * @type {Number}
     */
    this.highScore = 0

    /**
     * The currently focused (typed) word.
     * 
     * @type {EnemyValueObject}
     */
    this.currentTarget = null
    /**
     * Total number of lanes in the game area.
     * 
     * @type {Number}
     */
    this.numLanes = 6
    /**
     * Initial topmost lane of the game area.
     * 
     * @type {Number}
     */
    this.baseLane = -10
    /**
     * Number of pixels to add to place a word in a different lane.
     * 
     * @type {Number}
     */
    this.transformFactor = 55

    /**
     * Main game area - where enemy words are added.
     * 
     * @type {HTMLDivElement}
     */
    this.gameArea = document.getElementById('game-area')

    /**
     * The space between the game area ending and the word
     * 'starting over' is a little small. Subtracting 1.5
     * to give a little more space to the boundary.
     * 
     * @type {Number}
     */
    this.gameBoundary = this.gameArea.getBoundingClientRect().right - 1.5

    this.spawnInterval = null
    this.enqueueInterval = null
    this.difficultyInterval = null
    /**
     * Maximum amount of words that the queue can hold
     * at a time. Maxes @ 60.
     * 
     * @type {Number}
     */
    this.queueLimit = 30
    /**
     * Maximum amount of enemy words that can be active
     * in the game area at a time. Maxes @ 20.
     * 
     * @type {Number}
     */
    this.activeEnemyLimit = 10
    /**
     * Margin that accounts for words being added to 
     * game area as game progresses.
     * 
     * @type {Number}
     */
    this.queueErrorMargin = 3

    /**
     * The words missed during gameplay.
     * 
     * @type {String[]}
     */
    this.missedWords = []


    /**
     * Div containing the player's current lives.
     * 
     * @type {HTMLDivElement}
     */
    this.livesDiv = document.getElementById('lives')
    /**
     * Div containing the player's current score.
     * 
     * @type {HTMLDivElement}
     */
    this.scoreDiv = document.getElementById('score')

    /**
     * Div containing the current game mode.
     * 
     * @type {HTMLDivElement}
     */
    this.gameModeDiv = document.getElementById('game-mode')
    /**
     * Div containing the current difficulty level.
     * 
     * @type {HTMLDivElement}
     */
    this.difficultyLevelDiv = document.getElementById('difficulty')
    /**
     * Div containing the current word being typed.
     * 
     * @type {HTMLDivElement}
     */
    this.currentTargetDiv = document.getElementById('current-word')
    /**
     * Div containing a message about the difficulty increase.
     * 
     * @type {HTMLDivElement}
     */
    this.difficultyMessageDiv = document.getElementById('difficulty-message')
  }

  /**
   * Sets up default values for the game.
   * 
   * @param {"normal" | "survival"} mode The mode to start the game in.
   */
  initGame(mode) {
    this.score = 0
    this.gameMode = mode.toLowerCase() ?? "normal"
    this.lives = this.gameMode === "normal" ? 4 : 1

    this._loadIntoQueue()

    this.difficultyLevelDiv.textContent = `Difficulty: ${this.difficultyLevel}`
    this.gameModeDiv.textContent = `Mode: ${toTitleCase(this.gameMode)}`
    this.livesDiv.textContent = `Lives: ${this.lives}`
    this.scoreDiv.textContent = `Score: ${this.score}`

    this._setIntervals()

    document.addEventListener('keydown', e => {
      this._handleKeyPress(e)
    })

    this.gameArea.addEventListener('Collision', this._collisionHandler)

    if (!document.querySelector('button').disabled) {
      toggleButtonsVisibility()
    }
  }

  /**
   * Handles key presses by focusing a word
   * to be typed.
   * 
   * @param {KeyboardEvent} e
   */
  _handleKeyPress(e) {
    if (this.currentTarget) {
      // If a word is already focused
      if (e.key.toLowerCase() === this.currentTarget.enemy.next) {
        // console.log(`e key: ${e.key} matches next: ${this.currentTarget.enemy.next}`)
        // if so, make sure the pressed key is the correct one to complete the word
        this.currentTarget.enemy.updateCompletionPercentage()
        this.currentTargetDiv.innerHTML = this.currentTarget.enemy.getDisplayVersion()
        this.currentTarget.node.style.color = `rgb(0%, ${this.currentTarget.enemy.completed}%, 0%)`

        if (this.currentTarget.enemy.next === null) this._clearEnemyWord()
      }
      // implicitly do nothing
    } else {
      // if a word isn't focused, try and find the one the user is trying to spell
      const wordTarget = this.activeEnemies.get(e.key)
      if (wordTarget) {
        // if found, set the current target and update the completion percentage. 
        this._setCurrentTarget(wordTarget)
        wordTarget.enemy.updateCompletionPercentage()
      }
      this.currentTargetDiv.innerHTML = this.currentTarget.enemy.getDisplayVersion()
    }
    // implicitly do nothing
  }

  /**
   * @param {EnemyValueObject} enemy
   * Sets the current target after detecting a keypress.
   */
  _setCurrentTarget(enemy) {
    this.currentTarget = enemy
    enemy.node.classList.add('targeted')
  }

  /**
   * Adds new ```Enemy``` instances to the queue. 
   */
  _loadIntoQueue() {
    const needed = this.queueLimit - this.enemyQueue.size
    const newEnemies = []
    for (let i = 0; i < needed; i++) {
      const randomIndex = Math.floor(Math.random() * (words.length - 1))
      newEnemies.push(new Enemy(words[randomIndex]))
    }
    this.enemyQueue.enqueue(newEnemies)
  }

  /**
   * Clears the word from the screen.
   * Resets this.currentTarget and adds to streak.
   */
  _clearEnemyWord() {
    const node = this.currentTarget.node
    console.log(`streak: ${this.streak}`)
    this.score += (this.currentTarget.enemy.word.length + this.streak)
    this._updateDisplay('score', this.score)

    // use indexing here since .next should be null at this point
    this.activeEnemies.delete(this.currentTarget.enemy.word[0])
    clearInterval(this.currentTarget.detector)

    node.classList.add('cleared', 'word')
    node.addEventListener('transitioned', () => {
      node.parentNode.removeChild(node)
    })
    this.currentTarget = null
    this.streak += Math.ceil(1 + this.difficultyLevel)
  }

  /**
   * Spawns a new word into the game area.
   * 
   * @param {Enemy} enemy
   */
  _addEnemyWord(enemy) {
    /**
     * Return instantly if there's already
     * an active word in the enemy map that
     * starts with the same letter
     */
    if (this.activeEnemies.get(enemy.next)) return
    if (this.activeEnemies.size >= this.activeEnemyLimit) {
      console.log(`No words added - size: ${this.activeEnemies.size} greater than limit: ${this.activeEnemyLimit}`)
      return
    }

    // styles and the like
    const newEnemy = document.createElement('p')
    newEnemy.classList.add('enemy')
    newEnemy.textContent = enemy.word
    newEnemy.style.animationDuration = this._getAnimationDuration()
    newEnemy.style.transform = `translateY(${this._getEnemyPosition()}px)`
    newEnemy.style.transitionTimingFunction = 'cubic-bezier(0.25, 0.1, 0.25, 1.0)'

    // add the node and collision detection
    const node = this.gameArea.appendChild(newEnemy)
    const detector = setInterval(() => {
      if (node.getBoundingClientRect().left >= this.gameBoundary) {
        node.dispatchEvent(collisionEvent)
      }
    }, 75)

    this.activeEnemies.set(enemy.next, { enemy, node, detector })
  }

  /**
   * Increases the difficulty while it's still
   * beneath the maximum level. Once the max is
   * reached, it clears the interval that calls it.
   */
  _increaseDifficulty() {
    console.log(`Altering modifier: ${this.nextModifier}`)
    if (this.difficultyLevel === 5) {
      this.nextModifier = null
      clearInterval(this.difficultyInterval)
      return
    }

    const prevModifier = this.nextModifier
    if (this.nextModifier === 'interval') {
      if (this.enemySpawnDelay > 500) {
        this.loadQueueDelay -= 1000
        this.enemySpawnDelay -= 500
        this.difficultyLevel += .5
      }
    } else if (this.nextModifier === 'wordlimit') {
      if (this.queueLimit < 60) { // queueLimit & activeEnemyLimit max out at the same time
        this.queueLimit += 5
        this.activeEnemyLimit += 1
        this.difficultyLevel += .5
      }
    }

    this._setIntervals()
    this.nextModifier = prevModifier === 'interval' ? 'wordlimit' : 'interval'
    this._updateDisplay('message', this.difficultyLevel, prevModifier)
    this._updateDisplay('difficulty', this.difficultyLevel >= 5 ? 'MAX' : this.difficultyLevel)
  }

  /**
   * Clears first, and then sets up the
   * ```spawn```, ```enqueue```, and ```difficulty increase```
   * intervals.
   */
  _setIntervals() {
    clearInterval(this.spawnInterval)
    clearInterval(this.enqueueInterval)
    clearInterval(this.difficultyInterval)

    this.spawnInterval = setInterval(() => {
      this._addEnemyWord(this.enemyQueue.dequeue())
    }, this.enemySpawnDelay)

    this.enqueueInterval = setInterval(() => {
      this._loadIntoQueue()
    }, this.loadQueueDelay)

    this.difficultyInterval = setInterval(() => {
      this._increaseDifficulty()
    }, this.difficultyIncreaseDelay)
  }

  /**
   * Gets a position for a new word.
   * @returns {Number} Number passed to translateY to set the word's position.
   */
  _getEnemyPosition() {
    return this.baseLane + (this.transformFactor * Math.floor(Math.random() * this.numLanes))
  }

  /**
   * Returns a number between 10 and 35 inclusive
   * to be used as the animation duration.
   * @returns {Number}
   */
  _getAnimationDuration() {
    const longestDuration = 35
    const shortestDuration = 5
    return Math.floor(Math.random() * (longestDuration - shortestDuration + 1) + shortestDuration)
  }

  /**
   * Displays the results of the game.
   * 
   * @param {HTMLDivElement} parent Parent container for results.
   * @param {String[]} missedWords All words missed during the game.
   */
  _displayResults(parent, missedWords) {
    // create paragraph elements
    const [
      gameOver,
      scoreResult,
      gameModeResult,
      highScoreResult,
      missedWordsResult,
      difficultyLevelResult
    ] = Array.from({ length: 6 }, () => document.createElement('p'))

    // buttons
    const quitButton = document.createElement('button')
    const retryButton = document.createElement('button')

    // setting text
    scoreResult.textContent = `Score: ${this.score}`
    gameModeResult.textContent = `Mode: ${toTitleCase(this.gameMode)}`
    missedWordsResult.textContent = `Words Missed: ${missedWords.join(', ')}`
    difficultyLevelResult.textContent = `Level Reached: ${this.difficultyLevel >= 5 ? '5 (MAX) ' : this.difficultyLevel}`

    // setting text (broken up for some readability)
    quitButton.textContent = 'Quit'
    gameOver.style.fontSize = '60px'
    retryButton.textContent = 'Again?'
    gameOver.textContent = 'Game Over!'
    highScoreResult.textContent = `High Score: ${this.highScore}`

    // classes
    retryButton.classList.add('result-button', 'button')
    quitButton.classList.add('result-button', 'button')
    gameOver.classList.add('result-stats')

    // add gameOver message first
    parent.appendChild(gameOver)

    // add classes & append elements
    const resultElements = [
      gameModeResult,
      difficultyLevelResult,
      scoreResult,
      highScoreResult,
      missedWordsResult,
    ]
    resultElements.forEach(e => {
      e.classList.add('result-stats')
      parent.appendChild(e)
    })

    /**
     * Return element references to attach
     * click handlers outside
     */
    return {
      retryButton: parent.appendChild(retryButton),
      quitButton: parent.appendChild(quitButton)
    }
  }

  /**
   * Updates given ```display``` with given ```value.```
   * @param {string} display The display area to update. Can be the score, lives, or difficulty level displays.
   * @param {string} value The value to update the display with.
   * @param {string|undefined} modifier The most recent modifier altered during a difficulty increase.
   */
  _updateDisplay(display, value, modifier) {
    const displays = {
      'score': this.scoreDiv,
      'lives': this.livesDiv,
      'message': this.difficultyMessageDiv,
      'difficulty': this.difficultyLevelDiv,
    }

    const div = displays[display.toLowerCase()]

    if (display === 'message') {
      const substitute = modifier.toLowerCase() === 'interval' ? 'Intervals Decreased!' : 'More Words Coming!'
      const message = `Difficulty up - ${substitute}`
      const messageEl = document.createElement('span')
      messageEl.textContent = message

      div.appendChild(messageEl)

      const t = setTimeout(() => {
        messageEl.classList.add('cleared', 'difficulty')
      }, 100)

      messageEl.addEventListener('transitionend', () => {
        messageEl.parentNode.removeChild(messageEl)
        clearTimeout(t)
      })
    } else {
      const divPrefix = div.textContent.split(' ')[0]
      div.textContent = divPrefix + ` ${value}`
    }
  }

  /**
   * Ends the game and displays results.
   */
  endGame() {
    this.highScore = Math.max(this.score, this.highScore)

    // Remove any remaining enemies.
    const words = document.querySelectorAll('p')
    words.forEach(e => e.parentNode.removeChild(e))

    const resultsContainer = document.createElement('div')
    resultsContainer.classList.add('results-container')
    this.gameArea.appendChild(resultsContainer)

    // pass in this.missedWords before it's reset to have a correct reference
    const { retryButton, quitButton } = this._displayResults(resultsContainer, this.missedWords)
    this._resetDefaults()

    retryButton.onclick = () => {
      resultsContainer.remove()
      this.initGame(this.gameMode)
    }

    quitButton.onclick = () => {
      this.livesDiv.textContent = ''
      this.scoreDiv.textContent = ''
      this.gameModeDiv.textContent = ''
      this.difficultyLevelDiv.textContent = ''

      resultsContainer.remove()
      toggleButtonsVisibility()
    }

    clearInterval(this.spawnInterval)
    clearInterval(this.enqueueInterval)
    clearInterval(this.difficultyInterval)

  }

  /**
   * Resets all defaults save this.score,
   * as that is always set to 0 at the start of a game.
   */
  _resetDefaults() {
    this.enemyQueue.clear()
    this.activeEnemies.forEach(enemy => clearInterval(enemy.detector))
    this.gameArea.removeEventListener('Collision', this._collisionHandler)
    this.activeEnemies.clear()

    this.missedWords.length = 0

    this.streak = 0
    this.queueLimit = 30
    this.difficultyLevel = 0
    this.activeEnemyLimit = 10
    this.loadQueueDelay = 10000
    this.enemySpawnDelay = 2500

    this.currentTarget = null
    this.nextModifier = 'interval'
  }

  /**
   * Handles collisions between enemy words and
   * the game's leftmost boundary.
   * 
   * @param {Event} e
   */
  _collisionHandler = (e) => {
    const word = e.target.textContent

    console.log(`this: ${this}`)

    this.lives -= 1
    this.streak = 0
    this._updateDisplay('lives', this.lives)

    const enemy = this.activeEnemies.get(word[0])
    if (this.currentTarget === enemy) this.currentTarget = null
    this.activeEnemies.delete(word[0])
    clearInterval(enemy.detector)

    this.missedWords.push(word)
    enemy.node.parentNode.removeChild(enemy.node)

    if (this.lives <= 0) this.endGame()
  }
}

/**
 * Utility fn for titleCasing a space delimited string.
 * 
 * @param {String} str
 */
function toTitleCase(str) {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.substring(1))
    .join(' ')
}

/**
 * Utility fn for toggling button visibility.
 */
function toggleButtonsVisibility() {
  document
    .querySelectorAll('button')
    .forEach(button => {
      button.disabled = !button.disabled
      button.hidden = !button.hidden
    })
}
