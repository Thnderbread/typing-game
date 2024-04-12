import { Enemy } from "./Enemy.js"

export class Queue {
  constructor() {
    this.queue = []
    /**
     * Current length of the queue.
     * 
     * @type {Number}
     */
    this.size = 0
  }

  /**
   * Adds all elements of ```data``` to this.queue.
   * 
   * @param {Enemy[]} data Array of enemies to be added.
   */
  enqueue(data) {
    this.size += data.length
    this.queue.push(...new Set(data))
  }

  /**
   * Removes foremost element from the queue and returns it.
   * 
   * @returns {Enemy}
   */
  dequeue() {
    this.size -= 1
    return this.queue.shift()
  }

  /**
   * Clears the queue.
   */
  clear() {
    this.queue.length = 0
  }
}
