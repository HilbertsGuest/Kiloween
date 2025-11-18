/**
 * Demo script showing AnswerValidator in action
 * Run with: node TASK_17_DEMO.js
 */

const AnswerValidator = require('./src/main/AnswerValidator');

// Create validator instance
const validator = new AnswerValidator();

// Sample question
const question = {
  id: 'demo-q-1',
  text: 'What is the capital of France?',
  type: 'multiple-choice',
  options: ['London', 'Paris', 'Berlin', 'Madrid'],
  correctAnswer: 1, // Paris
  explanation: 'Paris is the capital and largest city of France, known for the Eiffel Tower.',
  sourceDocument: '/path/to/geography.pdf'
};

console.log('='.repeat(60));
console.log('ANSWER VALIDATOR DEMO');
console.log('='.repeat(60));
console.log('\nQuestion:', question.text);
console.log('Options:');
question.options.forEach((opt, idx) => {
  console.log(`  ${idx}. ${opt}`);
});
console.log('\n' + '='.repeat(60));

// Test correct answer
console.log('\n✅ CORRECT ANSWER SCENARIO (User selects: Paris)');
console.log('-'.repeat(60));
const correctResult = validator.validateMultipleChoice(question, 1);
console.log('Is Correct:', correctResult.isCorrect);
console.log('\nFeedback:');
console.log(correctResult.feedback);

console.log('\n' + '='.repeat(60));

// Test incorrect answer
console.log('\n❌ INCORRECT ANSWER SCENARIO (User selects: London)');
console.log('-'.repeat(60));
const incorrectResult = validator.validateMultipleChoice(question, 0);
console.log('Is Correct:', incorrectResult.isCorrect);
console.log('\nFeedback:');
console.log(incorrectResult.feedback);

console.log('\n' + '='.repeat(60));

// Show message variety
console.log('\n🎲 MESSAGE VARIETY DEMO');
console.log('-'.repeat(60));
console.log('\nSample Positive Messages:');
for (let i = 0; i < 3; i++) {
  console.log(`  ${i + 1}. ${validator.getRandomPositiveMessage()}`);
}

console.log('\nSample Encouraging Messages:');
for (let i = 0; i < 3; i++) {
  console.log(`  ${i + 1}. ${validator.getRandomEncouragingMessage()}`);
}

console.log('\n' + '='.repeat(60));
console.log('DEMO COMPLETE');
console.log('='.repeat(60));
