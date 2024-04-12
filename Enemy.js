export class Enemy {
  constructor(word) {
    this.typed = 0
    this.word = word
    this.completed = 0
    this.next = word[0]
    this.defeated = false
  }

  /**
   * Updates the amount of the word
   * the user has typed.
   */
  updateCompletionPercentage() {
    this.typed += 1
    this.next = this.word[this.typed] ?? null
    this.completed = (this.typed / this.word.length) * 100

    if (this.next === null) this.defeated = true
  }

  /**
   * Returns an HTML escaped string with the next letter
   * to be typed underlined.
   * 
   * @returns {String}
   */
  getDisplayVersion() {
    return `${this.word.substring(0, this.typed)}<u>${this.next ?? ''}</u>${this.word.substring(this.typed + 1)}`
  }
}
