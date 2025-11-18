const QuestionGenerator = require('./QuestionGenerator');
const fs = require('fs').promises;
const path = require('path');

describe('QuestionGenerator - Error Handling', () => {
    let generator;
    let testCachePath;

    beforeEach(() => {
        // Use a test-specific cache path
        testCachePath = path.join(__dirname, '../../data', `test-questions-${Date.now()}.json`);
        generator = new QuestionGenerator({ cachePath: testCachePath });
    });

    afterEach(async () => {
        // Clean up test cache file
        try {
            await fs.unlink(testCachePath);
        } catch (error) {
            // File might not exist, that's okay
        }
    });

    describe('hasQuestions', () => {
        it('should return false when no questions are cached', () => {
            expect(generator.hasQuestions()).toBe(false);
        });

        it('should return true when questions are cached', async () => {
            const questions = [
                {
                    id: 'q1',
                    text: 'What is mitochondria?',
                    type: 'multiple-choice',
                    options: ['Powerhouse', 'Nucleus', 'Cell wall', 'Membrane'],
                    correctAnswer: 0,
                    explanation: 'Mitochondria is the powerhouse of the cell',
                    sourceDocument: '/path/to/doc.pdf'
                }
            ];

            await generator.saveCache(questions, ['/path/to/doc.pdf']);
            expect(generator.hasQuestions()).toBe(true);
        });
    });

    describe('hasUnusedQuestions', () => {
        it('should return false when no questions are cached', () => {
            expect(generator.hasUnusedQuestions()).toBe(false);
        });

        it('should return true when unused questions exist', async () => {
            const questions = [
                {
                    id: 'q1',
                    text: 'What is mitochondria?',
                    type: 'multiple-choice',
                    options: ['Powerhouse', 'Nucleus', 'Cell wall', 'Membrane'],
                    correctAnswer: 0,
                    explanation: 'Mitochondria is the powerhouse of the cell',
                    sourceDocument: '/path/to/doc.pdf'
                }
            ];

            await generator.saveCache(questions, ['/path/to/doc.pdf']);
            expect(generator.hasUnusedQuestions()).toBe(true);
        });

        it('should return false when all questions are used', async () => {
            const questions = [
                {
                    id: 'q1',
                    text: 'What is mitochondria?',
                    type: 'multiple-choice',
                    options: ['Powerhouse', 'Nucleus', 'Cell wall', 'Membrane'],
                    correctAnswer: 0,
                    explanation: 'Mitochondria is the powerhouse of the cell',
                    sourceDocument: '/path/to/doc.pdf'
                }
            ];

            await generator.saveCache(questions, ['/path/to/doc.pdf']);
            generator.markQuestionUsed('q1');
            expect(generator.hasUnusedQuestions()).toBe(false);
        });

        it('should return true when some questions are unused', async () => {
            const questions = [
                {
                    id: 'q1',
                    text: 'What is mitochondria?',
                    type: 'multiple-choice',
                    options: ['Powerhouse', 'Nucleus', 'Cell wall', 'Membrane'],
                    correctAnswer: 0,
                    explanation: 'Mitochondria is the powerhouse of the cell',
                    sourceDocument: '/path/to/doc.pdf'
                },
                {
                    id: 'q2',
                    text: 'What is chloroplast?',
                    type: 'multiple-choice',
                    options: ['Photosynthesis', 'Respiration', 'Division', 'Transport'],
                    correctAnswer: 0,
                    explanation: 'Chloroplast performs photosynthesis',
                    sourceDocument: '/path/to/doc.pdf'
                }
            ];

            await generator.saveCache(questions, ['/path/to/doc.pdf']);
            generator.markQuestionUsed('q1');
            expect(generator.hasUnusedQuestions()).toBe(true);
        });
    });

    describe('generateQuestions - Error Handling', () => {
        it('should throw error for empty documents array', () => {
            expect(() => generator.generateQuestions([])).toThrow('No documents provided');
        });

        it('should throw error for null documents', () => {
            expect(() => generator.generateQuestions(null)).toThrow('No documents provided');
        });

        it('should throw error when no concepts can be extracted', () => {
            const documents = [
                {
                    filePath: '/path/to/empty.pdf',
                    content: '',
                    metadata: { title: 'Empty' }
                }
            ];

            expect(() => generator.generateQuestions(documents)).toThrow('Could not generate any valid questions');
        });

        it('should throw error when no valid questions can be generated', () => {
            const documents = [
                {
                    filePath: '/path/to/short.pdf',
                    content: 'a b c d e f g h',
                    metadata: { title: 'Short' }
                }
            ];

            expect(() => generator.generateQuestions(documents)).toThrow('Could not generate any valid questions');
        });

        it('should handle errors in individual question generation gracefully', () => {
            const documents = [
                {
                    filePath: '/path/to/doc.pdf',
                    content: 'Biology biology biology is important. Chemistry chemistry chemistry is interesting. Physics physics physics is complex.',
                    metadata: { title: 'Science' }
                }
            ];

            // Should not throw even if some questions fail
            const questions = generator.generateQuestions(documents, 10);
            expect(Array.isArray(questions)).toBe(true);
        });
    });

    describe('generateQuestionsWithFallback', () => {
        it('should generate new questions successfully', async () => {
            const documents = [
                {
                    filePath: '/path/to/biology.pdf',
                    content: 'Mitochondria mitochondria produce energy energy. Chloroplasts chloroplasts perform photosynthesis photosynthesis.',
                    metadata: { title: 'Biology' }
                }
            ];

            const result = await generator.generateQuestionsWithFallback(documents, 10);

            expect(result).toBeDefined();
            expect(result.questions).toBeDefined();
            expect(Array.isArray(result.questions)).toBe(true);
            expect(result.questions.length).toBeGreaterThan(0);
            expect(result.usedCache).toBe(false);
            expect(result.error).toBeNull();
        });

        it('should fall back to cached questions on generation failure', async () => {
            // First, save some cached questions
            const cachedQuestions = [
                {
                    id: 'cached-q1',
                    text: 'What is cached question?',
                    type: 'multiple-choice',
                    options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
                    correctAnswer: 0,
                    explanation: 'This is a cached question',
                    sourceDocument: '/path/to/old-doc.pdf'
                }
            ];

            await generator.saveCache(cachedQuestions, ['/path/to/old-doc.pdf']);

            // Now try to generate with invalid documents
            const invalidDocuments = [
                {
                    filePath: '/path/to/invalid.pdf',
                    content: '',
                    metadata: { title: 'Invalid' }
                }
            ];

            const result = await generator.generateQuestionsWithFallback(invalidDocuments, 10);

            expect(result).toBeDefined();
            expect(result.questions).toBeDefined();
            expect(result.questions.length).toBe(1);
            expect(result.questions[0].id).toBe('cached-q1');
            expect(result.usedCache).toBe(true);
            expect(result.error).toBeNull();
        });

        it('should return error when generation fails and no cache exists', async () => {
            const invalidDocuments = [
                {
                    filePath: '/path/to/invalid.pdf',
                    content: '',
                    metadata: { title: 'Invalid' }
                }
            ];

            const result = await generator.generateQuestionsWithFallback(invalidDocuments, 10);

            expect(result).toBeDefined();
            expect(result.questions).toEqual([]);
            expect(result.usedCache).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('No questions could be generated');
        });

        it('should save newly generated questions to cache', async () => {
            const documents = [
                {
                    filePath: '/path/to/biology.pdf',
                    content: 'Mitochondria mitochondria produce energy energy. Chloroplasts chloroplasts perform photosynthesis photosynthesis.',
                    metadata: { title: 'Biology' }
                }
            ];

            const result = await generator.generateQuestionsWithFallback(documents, 10);

            expect(result.usedCache).toBe(false);

            // Verify cache was saved
            const cacheData = await generator.loadCache();
            expect(cacheData.questions.length).toBeGreaterThan(0);
        });

        it('should handle cache load errors gracefully', async () => {
            // Create a corrupted cache file
            await fs.writeFile(testCachePath, 'invalid json{{{', 'utf8');

            const invalidDocuments = [
                {
                    filePath: '/path/to/invalid.pdf',
                    content: '',
                    metadata: { title: 'Invalid' }
                }
            ];

            const result = await generator.generateQuestionsWithFallback(invalidDocuments, 10);

            expect(result).toBeDefined();
            expect(result.questions).toEqual([]);
            expect(result.error).toBeDefined();
        });
    });

    describe('Integration with empty/invalid documents', () => {
        it('should handle completely empty document', async () => {
            const documents = [
                {
                    filePath: '/path/to/empty.pdf',
                    content: '',
                    metadata: { title: 'Empty Document' }
                }
            ];

            const result = await generator.generateQuestionsWithFallback(documents, 10);

            expect(result.questions).toEqual([]);
            expect(result.error).toBeDefined();
        });

        it('should handle document with only whitespace', async () => {
            const documents = [
                {
                    filePath: '/path/to/whitespace.pdf',
                    content: '   \n\n\t\t   ',
                    metadata: { title: 'Whitespace Document' }
                }
            ];

            const result = await generator.generateQuestionsWithFallback(documents, 10);

            expect(result.questions).toEqual([]);
            expect(result.error).toBeDefined();
        });

        it('should handle document with insufficient content', async () => {
            const documents = [
                {
                    filePath: '/path/to/short.pdf',
                    content: 'Short text.',
                    metadata: { title: 'Short Document' }
                }
            ];

            const result = await generator.generateQuestionsWithFallback(documents, 10);

            expect(result.questions).toEqual([]);
            expect(result.error).toBeDefined();
        });

        it('should handle document with only stop words', async () => {
            const documents = [
                {
                    filePath: '/path/to/stopwords.pdf',
                    content: 'the and or but if then when where what how',
                    metadata: { title: 'Stop Words Document' }
                }
            ];

            const result = await generator.generateQuestionsWithFallback(documents, 10);

            expect(result.questions).toEqual([]);
            expect(result.error).toBeDefined();
        });

        it('should handle mixed valid and invalid documents', async () => {
            // Save some cached questions first
            const cachedQuestions = [
                {
                    id: 'cached-q1',
                    text: 'What is cached?',
                    type: 'multiple-choice',
                    options: ['A', 'B', 'C', 'D'],
                    correctAnswer: 0,
                    explanation: 'Cached',
                    sourceDocument: '/path/to/old.pdf'
                }
            ];

            await generator.saveCache(cachedQuestions, ['/path/to/old.pdf']);

            const documents = [
                {
                    filePath: '/path/to/empty.pdf',
                    content: '',
                    metadata: { title: 'Empty' }
                },
                {
                    filePath: '/path/to/short.pdf',
                    content: 'Too short',
                    metadata: { title: 'Short' }
                }
            ];

            const result = await generator.generateQuestionsWithFallback(documents, 10);

            // Should fall back to cached questions
            expect(result.usedCache).toBe(true);
            expect(result.questions.length).toBe(1);
        });
    });
});
