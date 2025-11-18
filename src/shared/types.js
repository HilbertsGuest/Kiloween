/**
 * Type definitions for the Spooky Study App
 * These serve as documentation for the data structures used throughout the app
 */

/**
 * @typedef {Object} Config
 * @property {string} version - Application version
 * @property {number} interval - Timer interval in minutes (5-120)
 * @property {string[]} documents - Array of document file paths
 * @property {boolean} audioEnabled - Whether audio is enabled
 * @property {'easy'|'medium'|'hard'} difficulty - Question difficulty level
 * @property {'halloween'|'dark'} theme - UI theme
 * @property {string|null} lastRun - ISO timestamp of last run
 */

/**
 * @typedef {Object} DocumentContent
 * @property {string} filePath - Path to the document
 * @property {string} content - Extracted text content
 * @property {DocumentMetadata} metadata - Document metadata
 */

/**
 * @typedef {Object} DocumentMetadata
 * @property {string} title - Document title
 * @property {number} [pageCount] - Number of pages (for PDFs)
 * @property {number} wordCount - Number of words
 */

/**
 * @typedef {Object} Question
 * @property {string} id - Unique question identifier
 * @property {string} text - Question text
 * @property {'multiple-choice'|'text'} type - Question type
 * @property {string[]} [options] - Answer options (for multiple-choice)
 * @property {string|number} correctAnswer - Correct answer
 * @property {string} [explanation] - Explanation for the answer
 * @property {string} sourceDocument - Path to source document
 */

/**
 * @typedef {Object} SessionState
 * @property {string} sessionStart - ISO timestamp of session start
 * @property {number} questionsAnswered - Number of questions answered
 * @property {number} correctAnswers - Number of correct answers
 * @property {number} currentStreak - Current correct answer streak
 * @property {string} timerStarted - ISO timestamp of timer start
 */

/**
 * @typedef {Object} QuestionCache
 * @property {string} generated - ISO timestamp of generation
 * @property {Question[]} questions - Array of generated questions
 * @property {string[]} usedInSession - Array of question IDs used in current session
 */

module.exports = {};
