const QuestionGenerator = require('./QuestionGenerator');

describe('QuestionGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new QuestionGenerator();
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      expect(generator).toBeDefined();
      expect(generator.minKeywordLength).toBe(4);
      expect(generator.maxKeywords).toBe(20);
      expect(generator.minKeywordFrequency).toBe(2);
    });

    it('should accept custom options', () => {
      const customGenerator = new QuestionGenerator({
        minKeywordLength: 5,
        maxKeywords: 10,
        minKeywordFrequency: 3
      });

      expect(customGenerator.minKeywordLength).toBe(5);
      expect(customGenerator.maxKeywords).toBe(10);
      expect(customGenerator.minKeywordFrequency).toBe(3);
    });

    it('should have stop words defined', () => {
      expect(generator.stopWords).toBeDefined();
      expect(generator.stopWords.size).toBeGreaterThan(0);
      expect(generator.stopWords.has('the')).toBe(true);
      expect(generator.stopWords.has('and')).toBe(true);
    });
  });

  describe('extractKeywords', () => {
    it('should extract keywords from simple text', () => {
      const content = 'Mitochondria are the powerhouse of the cell. Mitochondria produce energy through cellular respiration.';
      const keywords = generator.extractKeywords(content);

      expect(keywords).toBeDefined();
      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords.length).toBeGreaterThan(0);
      
      // Should find 'mitochondria' as a keyword
      const mitochondriaKeyword = keywords.find(k => k.word === 'mitochondria');
      expect(mitochondriaKeyword).toBeDefined();
      expect(mitochondriaKeyword.frequency).toBe(2);
    });

    it('should return empty array for empty content', () => {
      expect(generator.extractKeywords('')).toEqual([]);
      expect(generator.extractKeywords(null)).toEqual([]);
      expect(generator.extractKeywords(undefined)).toEqual([]);
      expect(generator.extractKeywords('   ')).toEqual([]);
    });

    it('should filter out stop words', () => {
      const content = 'The quick brown fox jumps over the lazy dog. The fox is very quick.';
      const keywords = generator.extractKeywords(content);

      // Stop words like 'the', 'is', 'over' should not appear
      const hasStopWords = keywords.some(k => 
        generator.stopWords.has(k.word)
      );
      expect(hasStopWords).toBe(false);
    });

    it('should filter out short words', () => {
      const content = 'DNA RNA ATP are key molecules in biology. Deoxyribonucleic acid is important.';
      const keywords = generator.extractKeywords(content);

      // Words shorter than minKeywordLength should not appear
      const hasShortWords = keywords.some(k => k.word.length < generator.minKeywordLength);
      expect(hasShortWords).toBe(false);
    });

    it('should filter out pure numbers', () => {
      const content = 'In 2024, there were 100 students studying 500 topics in biology.';
      const keywords = generator.extractKeywords(content);

      // Pure numbers should not appear as keywords
      const hasNumbers = keywords.some(k => /^\d+$/.test(k.word));
      expect(hasNumbers).toBe(false);
    });

    it('should respect minimum frequency threshold', () => {
      const content = 'Photosynthesis occurs in plants. Chlorophyll is green. Plants need water.';
      const keywords = generator.extractKeywords(content);

      // All keywords should appear at least minKeywordFrequency times
      keywords.forEach(keyword => {
        expect(keyword.frequency).toBeGreaterThanOrEqual(generator.minKeywordFrequency);
      });
    });

    it('should calculate scores based on frequency and length', () => {
      const content = 'Photosynthesis photosynthesis photosynthesis. Cell cell cell cell.';
      const keywords = generator.extractKeywords(content);

      expect(keywords.length).toBeGreaterThan(0);
      keywords.forEach(keyword => {
        expect(keyword.score).toBeDefined();
        expect(keyword.score).toBeGreaterThan(0);
      });
    });

    it('should sort keywords by score in descending order', () => {
      const content = 'Biology biology biology biology. Chemistry chemistry chemistry. Physics physics.';
      const keywords = generator.extractKeywords(content);

      // Check that scores are in descending order
      for (let i = 0; i < keywords.length - 1; i++) {
        expect(keywords[i].score).toBeGreaterThanOrEqual(keywords[i + 1].score);
      }
    });

    it('should limit keywords to maxKeywords', () => {
      const customGenerator = new QuestionGenerator({ maxKeywords: 5, minKeywordFrequency: 1 });
      
      // Create content with many different words
      const words = [];
      for (let i = 0; i < 20; i++) {
        words.push(`keyword${i} keyword${i}`);
      }
      const content = words.join(' ');
      
      const keywords = customGenerator.extractKeywords(content);
      expect(keywords.length).toBeLessThanOrEqual(5);
    });

    it('should handle text with punctuation', () => {
      const content = 'Hello! How are you? I am fine. Thank you!';
      const keywords = generator.extractKeywords(content);

      // Should extract words without punctuation
      keywords.forEach(keyword => {
        expect(keyword.word).not.toMatch(/[!?.]/);
      });
    });

    it('should handle hyphenated words', () => {
      const content = 'Self-replication self-replication is important. Self-replication occurs in cells.';
      const keywords = generator.extractKeywords(content);

      // Should handle hyphenated words
      const hyphenatedKeyword = keywords.find(k => k.word.includes('-'));
      expect(hyphenatedKeyword).toBeDefined();
    });

    it('should be case-insensitive', () => {
      const content = 'Biology BIOLOGY biology BiOlOgY';
      const keywords = generator.extractKeywords(content);

      // All variations should be counted as the same word
      const biologyKeyword = keywords.find(k => k.word === 'biology');
      expect(biologyKeyword).toBeDefined();
      expect(biologyKeyword.frequency).toBe(4);
    });
  });

  describe('extractSentencesWithKeywords', () => {
    it('should extract sentences containing keywords', () => {
      const content = 'Mitochondria produce energy. The cell membrane is important. Mitochondria are organelles.';
      const keywords = ['mitochondria'];
      
      const sentences = generator.extractSentencesWithKeywords(content, keywords);

      expect(sentences).toBeDefined();
      expect(Array.isArray(sentences)).toBe(true);
      expect(sentences.length).toBe(2);
      expect(sentences[0]).toContain('Mitochondria');
    });

    it('should return empty array for empty content', () => {
      expect(generator.extractSentencesWithKeywords('', ['keyword'])).toEqual([]);
      expect(generator.extractSentencesWithKeywords(null, ['keyword'])).toEqual([]);
    });

    it('should return empty array for empty keywords', () => {
      const content = 'This is some content.';
      expect(generator.extractSentencesWithKeywords(content, [])).toEqual([]);
      expect(generator.extractSentencesWithKeywords(content, null)).toEqual([]);
    });

    it('should be case-insensitive when matching keywords', () => {
      const content = 'MITOCHONDRIA produce energy. The cell is important. mitochondria are organelles.';
      const keywords = ['mitochondria'];
      
      const sentences = generator.extractSentencesWithKeywords(content, keywords);

      expect(sentences.length).toBe(2);
    });

    it('should filter out very short sentences', () => {
      const content = 'Hi. This is a longer sentence with mitochondria in it. Bye.';
      const keywords = ['mitochondria'];
      
      const sentences = generator.extractSentencesWithKeywords(content, keywords);

      // Should only get the longer sentence
      expect(sentences.length).toBe(1);
      expect(sentences[0]).toContain('longer sentence');
    });

    it('should handle multiple sentence endings', () => {
      const content = 'What is mitochondria? Mitochondria produce energy! Cells are amazing.';
      const keywords = ['mitochondria'];
      
      const sentences = generator.extractSentencesWithKeywords(content, keywords);

      expect(sentences.length).toBe(2);
    });

    it('should sort sentences by keyword count', () => {
      const content = 'Mitochondria produce energy. Mitochondria and chloroplast are organelles. Cells exist.';
      const keywords = ['mitochondria', 'chloroplast'];
      
      const sentences = generator.extractSentencesWithKeywords(content, keywords);

      // Sentence with both keywords should come first
      expect(sentences[0]).toContain('chloroplast');
    });

    it('should handle multiple keywords in one sentence', () => {
      const content = 'Photosynthesis and respiration are cellular processes.';
      const keywords = ['photosynthesis', 'respiration', 'cellular'];
      
      const sentences = generator.extractSentencesWithKeywords(content, keywords);

      expect(sentences.length).toBe(1);
      expect(sentences[0]).toContain('Photosynthesis');
    });
  });

  describe('identifyKeyConcepts', () => {
    it('should identify key concepts from a document', () => {
      const document = {
        filePath: '/path/to/biology.pdf',
        content: 'Mitochondria are the powerhouse of the cell. Mitochondria produce energy through cellular respiration. Cellular respiration is important.',
        metadata: {
          title: 'Biology Notes',
          wordCount: 20
        }
      };

      const concepts = generator.identifyKeyConcepts(document);

      expect(concepts).toBeDefined();
      expect(concepts.keywords).toBeDefined();
      expect(concepts.sourceSentences).toBeDefined();
      expect(concepts.documentPath).toBe('/path/to/biology.pdf');
      expect(concepts.documentTitle).toBe('Biology Notes');
    });

    it('should return empty concepts for null document', () => {
      const concepts = generator.identifyKeyConcepts(null);

      expect(concepts.keywords).toEqual([]);
      expect(concepts.sourceSentences).toEqual([]);
      expect(concepts.documentPath).toBe('unknown');
    });

    it('should return empty concepts for document without content', () => {
      const document = {
        filePath: '/path/to/empty.pdf',
        content: '',
        metadata: { title: 'Empty' }
      };

      const concepts = generator.identifyKeyConcepts(document);

      expect(concepts.keywords).toEqual([]);
      expect(concepts.sourceSentences).toEqual([]);
    });

    it('should include keywords in source sentences metadata', () => {
      const document = {
        filePath: '/path/to/doc.pdf',
        content: 'Photosynthesis occurs in plants. Photosynthesis produces oxygen. Plants need sunlight.',
        metadata: { title: 'Photosynthesis' }
      };

      const concepts = generator.identifyKeyConcepts(document);

      expect(concepts.sourceSentences.length).toBeGreaterThan(0);
      concepts.sourceSentences.forEach(source => {
        expect(source.sentence).toBeDefined();
        expect(source.keywords).toBeDefined();
        expect(Array.isArray(source.keywords)).toBe(true);
        expect(source.sourceDocument).toBe('/path/to/doc.pdf');
      });
    });

    it('should limit source sentences to 50', () => {
      // Create content with many sentences
      const sentences = [];
      for (let i = 0; i < 100; i++) {
        sentences.push(`Biology biology biology is important topic number ${i}.`);
      }
      const document = {
        filePath: '/path/to/long.pdf',
        content: sentences.join(' '),
        metadata: { title: 'Long Document' }
      };

      const concepts = generator.identifyKeyConcepts(document);

      expect(concepts.sourceSentences.length).toBeLessThanOrEqual(50);
    });
  });

  describe('processDocuments', () => {
    it('should process multiple documents', () => {
      const documents = [
        {
          filePath: '/path/to/doc1.pdf',
          content: 'Mitochondria mitochondria produce energy energy.',
          metadata: { title: 'Doc 1' }
        },
        {
          filePath: '/path/to/doc2.pdf',
          content: 'Photosynthesis photosynthesis occurs in plants plants.',
          metadata: { title: 'Doc 2' }
        }
      ];

      const conceptsMap = generator.processDocuments(documents);

      expect(conceptsMap).toBeDefined();
      expect(conceptsMap.size).toBe(2);
      expect(conceptsMap.has('/path/to/doc1.pdf')).toBe(true);
      expect(conceptsMap.has('/path/to/doc2.pdf')).toBe(true);
    });

    it('should return empty map for empty array', () => {
      const conceptsMap = generator.processDocuments([]);
      expect(conceptsMap.size).toBe(0);
    });

    it('should return empty map for null input', () => {
      const conceptsMap = generator.processDocuments(null);
      expect(conceptsMap.size).toBe(0);
    });

    it('should handle errors gracefully and continue processing', () => {
      const documents = [
        {
          filePath: '/path/to/good.pdf',
          content: 'Biology biology biology is important.',
          metadata: { title: 'Good Doc' }
        },
        {
          filePath: '/path/to/bad.pdf',
          content: null, // This will cause an error
          metadata: { title: 'Bad Doc' }
        },
        {
          filePath: '/path/to/another-good.pdf',
          content: 'Chemistry chemistry chemistry is interesting.',
          metadata: { title: 'Another Good Doc' }
        }
      ];

      const conceptsMap = generator.processDocuments(documents);

      // Should process the good documents despite error in one
      expect(conceptsMap.size).toBeGreaterThanOrEqual(2);
      expect(conceptsMap.has('/path/to/good.pdf')).toBe(true);
      expect(conceptsMap.has('/path/to/another-good.pdf')).toBe(true);
    });
  });

  describe('getKeywordStatistics', () => {
    it('should calculate statistics for multiple documents', () => {
      const documents = [
        {
          filePath: '/path/to/doc1.pdf',
          content: 'Biology biology biology chemistry chemistry physics physics physics physics.',
          metadata: { title: 'Doc 1' }
        },
        {
          filePath: '/path/to/doc2.pdf',
          content: 'Mathematics mathematics mathematics algebra algebra geometry geometry geometry geometry.',
          metadata: { title: 'Doc 2' }
        }
      ];

      const stats = generator.getKeywordStatistics(documents);

      expect(stats).toBeDefined();
      expect(stats.totalDocuments).toBe(2);
      expect(stats.totalKeywords).toBeGreaterThan(0);
      expect(stats.totalSourceSentences).toBeGreaterThanOrEqual(0);
      expect(stats.averageKeywordsPerDocument).toBeGreaterThan(0);
      expect(stats.averageSentencesPerDocument).toBeGreaterThanOrEqual(0);
    });

    it('should return zero statistics for empty array', () => {
      const stats = generator.getKeywordStatistics([]);

      expect(stats.totalDocuments).toBe(0);
      expect(stats.totalKeywords).toBe(0);
      expect(stats.totalSourceSentences).toBe(0);
      expect(stats.averageKeywordsPerDocument).toBe(0);
      expect(stats.averageSentencesPerDocument).toBe(0);
    });

    it('should return zero statistics for null input', () => {
      const stats = generator.getKeywordStatistics(null);

      expect(stats.totalDocuments).toBe(0);
      expect(stats.totalKeywords).toBe(0);
    });

    it('should calculate correct averages', () => {
      const documents = [
        {
          filePath: '/path/to/doc1.pdf',
          content: 'Biology biology biology chemistry chemistry.',
          metadata: { title: 'Doc 1' }
        }
      ];

      const stats = generator.getKeywordStatistics(documents);

      expect(stats.averageKeywordsPerDocument).toBe(stats.totalKeywords / stats.totalDocuments);
      expect(stats.averageSentencesPerDocument).toBe(stats.totalSourceSentences / stats.totalDocuments);
    });
  });

  describe('generateQuestionFromSentence', () => {
    it('should generate a question by replacing a keyword with a blank', () => {
      const sentence = 'Mitochondria are the powerhouse of the cell.';
      const keywords = ['mitochondria', 'powerhouse', 'cell'];

      const result = generator.generateQuestionFromSentence(sentence, keywords);

      expect(result).toBeDefined();
      expect(result.questionText).toBeDefined();
      expect(result.correctAnswer).toBeDefined();
      expect(result.questionText).toContain('______');
      expect(result.questionText).toContain('?');
    });

    it('should return null for empty sentence', () => {
      const result = generator.generateQuestionFromSentence('', ['keyword']);
      expect(result).toBeNull();
    });

    it('should return null for empty keywords', () => {
      const result = generator.generateQuestionFromSentence('Some sentence.', []);
      expect(result).toBeNull();
    });

    it('should return null for null inputs', () => {
      expect(generator.generateQuestionFromSentence(null, ['keyword'])).toBeNull();
      expect(generator.generateQuestionFromSentence('sentence', null)).toBeNull();
    });

    it('should select the longest keyword for replacement', () => {
      const sentence = 'Photosynthesis occurs in plant cells.';
      const keywords = ['plant', 'photosynthesis', 'cells'];

      const result = generator.generateQuestionFromSentence(sentence, keywords);

      expect(result).toBeDefined();
      expect(result.correctAnswer.toLowerCase()).toBe('photosynthesis');
    });

    it('should capitalize the first letter of the answer', () => {
      const sentence = 'Mitochondria produce energy.';
      const keywords = ['mitochondria'];

      const result = generator.generateQuestionFromSentence(sentence, keywords);

      expect(result.correctAnswer).toBe('Mitochondria');
      expect(result.correctAnswer.charAt(0)).toBe(result.correctAnswer.charAt(0).toUpperCase());
    });

    it('should ensure question ends with question mark', () => {
      const sentence = 'The nucleus contains DNA.';
      const keywords = ['nucleus'];

      const result = generator.generateQuestionFromSentence(sentence, keywords);

      expect(result.questionText).toMatch(/\?$/);
    });

    it('should add "What" prefix when needed', () => {
      const sentence = 'The mitochondria produces energy.';
      const keywords = ['mitochondria'];

      const result = generator.generateQuestionFromSentence(sentence, keywords);

      expect(result.questionText.toLowerCase()).toMatch(/^what/);
    });

    it('should not add prefix if question already starts with question word', () => {
      const sentence = 'Where does photosynthesis occur?';
      const keywords = ['photosynthesis'];

      const result = generator.generateQuestionFromSentence(sentence, keywords);

      expect(result.questionText.toLowerCase()).toMatch(/^where/);
      expect(result.questionText.toLowerCase()).not.toMatch(/^what/);
    });

    it('should handle case-insensitive keyword matching', () => {
      const sentence = 'MITOCHONDRIA produce energy.';
      const keywords = ['mitochondria'];

      const result = generator.generateQuestionFromSentence(sentence, keywords);

      expect(result).toBeDefined();
      expect(result.correctAnswer).toBe('Mitochondria'); // Normalized to proper case
    });

    it('should return null if keyword not found in sentence', () => {
      const sentence = 'The cell produces energy.';
      const keywords = ['mitochondria'];

      const result = generator.generateQuestionFromSentence(sentence, keywords);

      expect(result).toBeNull();
    });

    it('should handle multiple occurrences of keyword', () => {
      const sentence = 'Cells divide when cells need to reproduce.';
      const keywords = ['cells'];

      const result = generator.generateQuestionFromSentence(sentence, keywords);

      expect(result).toBeDefined();
      // Should replace first occurrence
      expect(result.questionText).toContain('______');
    });
  });

  describe('generateDistractors', () => {
    it('should generate distractor options', () => {
      const correctAnswer = 'Mitochondria';
      const allKeywords = ['chloroplast', 'nucleus', 'ribosome', 'membrane', 'cytoplasm'];

      const distractors = generator.generateDistractors(correctAnswer, allKeywords, 3);

      expect(distractors).toBeDefined();
      expect(Array.isArray(distractors)).toBe(true);
      expect(distractors.length).toBeLessThanOrEqual(3);
    });

    it('should not include the correct answer in distractors', () => {
      const correctAnswer = 'Mitochondria';
      const allKeywords = ['mitochondria', 'chloroplast', 'nucleus', 'ribosome'];

      const distractors = generator.generateDistractors(correctAnswer, allKeywords, 3);

      const hasCorrectAnswer = distractors.some(d => 
        d.toLowerCase() === correctAnswer.toLowerCase()
      );
      expect(hasCorrectAnswer).toBe(false);
    });

    it('should return empty array for empty keywords', () => {
      const distractors = generator.generateDistractors('Answer', [], 3);
      expect(distractors).toEqual([]);
    });

    it('should return empty array for null inputs', () => {
      expect(generator.generateDistractors(null, ['keyword'], 3)).toEqual([]);
      expect(generator.generateDistractors('Answer', null, 3)).toEqual([]);
    });

    it('should filter out short keywords', () => {
      const correctAnswer = 'Mitochondria';
      const allKeywords = ['a', 'an', 'chloroplast', 'nucleus'];

      const distractors = generator.generateDistractors(correctAnswer, allKeywords, 3);

      // Should not include very short words
      const hasShortWords = distractors.some(d => d.length < 4);
      expect(hasShortWords).toBe(false);
    });

    it('should capitalize first letter of distractors', () => {
      const correctAnswer = 'Mitochondria';
      const allKeywords = ['chloroplast', 'nucleus', 'ribosome'];

      const distractors = generator.generateDistractors(correctAnswer, allKeywords, 3);

      distractors.forEach(distractor => {
        expect(distractor.charAt(0)).toBe(distractor.charAt(0).toUpperCase());
      });
    });

    it('should remove duplicate distractors', () => {
      const correctAnswer = 'Mitochondria';
      const allKeywords = ['chloroplast', 'Chloroplast', 'CHLOROPLAST', 'nucleus'];

      const distractors = generator.generateDistractors(correctAnswer, allKeywords, 3);

      // Should not have duplicates (case-insensitive)
      const lowerCaseDistractors = distractors.map(d => d.toLowerCase());
      const uniqueDistractors = [...new Set(lowerCaseDistractors)];
      expect(lowerCaseDistractors.length).toBe(uniqueDistractors.length);
    });

    it('should respect the count parameter', () => {
      const correctAnswer = 'Mitochondria';
      const allKeywords = ['chloroplast', 'nucleus', 'ribosome', 'membrane', 'cytoplasm', 'vacuole'];

      const distractors = generator.generateDistractors(correctAnswer, allKeywords, 2);

      expect(distractors.length).toBeLessThanOrEqual(2);
    });

    it('should handle case when not enough keywords available', () => {
      const correctAnswer = 'Mitochondria';
      const allKeywords = ['cell'];

      const distractors = generator.generateDistractors(correctAnswer, allKeywords, 3);

      expect(distractors.length).toBeLessThanOrEqual(1);
    });
  });

  describe('generateMultipleChoiceQuestion', () => {
    it('should generate a complete multiple-choice question', () => {
      const source = {
        sentence: 'Mitochondria are the powerhouse of the cell.',
        keywords: ['mitochondria', 'powerhouse', 'cell'],
        sourceDocument: '/path/to/biology.pdf'
      };
      const allKeywords = ['mitochondria', 'chloroplast', 'nucleus', 'ribosome', 'membrane'];

      const question = generator.generateMultipleChoiceQuestion(source, allKeywords);

      expect(question).toBeDefined();
      expect(question.id).toBeDefined();
      expect(question.text).toBeDefined();
      expect(question.type).toBe('multiple-choice');
      expect(question.options).toBeDefined();
      expect(Array.isArray(question.options)).toBe(true);
      expect(question.options.length).toBeGreaterThanOrEqual(3);
      expect(question.correctAnswer).toBeDefined();
      expect(typeof question.correctAnswer).toBe('number');
      expect(question.correctAnswer).toBeGreaterThanOrEqual(0);
      expect(question.correctAnswer).toBeLessThan(question.options.length);
      expect(question.explanation).toBeDefined();
      expect(question.sourceDocument).toBe('/path/to/biology.pdf');
    });

    it('should return null for invalid source', () => {
      const allKeywords = ['keyword1', 'keyword2'];

      expect(generator.generateMultipleChoiceQuestion(null, allKeywords)).toBeNull();
      expect(generator.generateMultipleChoiceQuestion({}, allKeywords)).toBeNull();
      expect(generator.generateMultipleChoiceQuestion({ sentence: '' }, allKeywords)).toBeNull();
    });

    it('should return null when not enough distractors available', () => {
      const source = {
        sentence: 'Mitochondria produce energy.',
        keywords: ['mitochondria'],
        sourceDocument: '/path/to/doc.pdf'
      };
      const allKeywords = ['mitochondria', 'cell']; // Only one other keyword

      const question = generator.generateMultipleChoiceQuestion(source, allKeywords);

      // Should return null because we need at least 2 distractors
      expect(question).toBeNull();
    });

    it('should shuffle answer options', () => {
      const source = {
        sentence: 'Photosynthesis occurs in chloroplasts.',
        keywords: ['photosynthesis', 'chloroplasts'],
        sourceDocument: '/path/to/doc.pdf'
      };
      const allKeywords = ['photosynthesis', 'mitochondria', 'nucleus', 'ribosome', 'membrane'];

      // Generate multiple questions to test shuffling
      const questions = [];
      for (let i = 0; i < 10; i++) {
        const q = generator.generateMultipleChoiceQuestion(source, allKeywords);
        if (q) {
          questions.push(q);
        }
      }

      // Check that correct answer is not always at the same position
      const positions = questions.map(q => q.correctAnswer);
      const uniquePositions = [...new Set(positions)];
      
      // With 10 attempts, we should see some variation (not always position 0)
      expect(uniquePositions.length).toBeGreaterThan(1);
    });

    it('should include correct answer in options', () => {
      const source = {
        sentence: 'The nucleus contains DNA.',
        keywords: ['nucleus', 'dna'],
        sourceDocument: '/path/to/doc.pdf'
      };
      const allKeywords = ['nucleus', 'mitochondria', 'chloroplast', 'ribosome', 'membrane'];

      const question = generator.generateMultipleChoiceQuestion(source, allKeywords);

      expect(question).toBeDefined();
      const correctOption = question.options[question.correctAnswer];
      expect(correctOption).toBeDefined();
      expect(correctOption.length).toBeGreaterThan(0);
    });

    it('should generate unique question IDs', () => {
      const source = {
        sentence: 'Cells divide during mitosis.',
        keywords: ['cells', 'mitosis'],
        sourceDocument: '/path/to/doc.pdf'
      };
      const allKeywords = ['cells', 'mitosis', 'nucleus', 'membrane', 'cytoplasm'];

      const question1 = generator.generateMultipleChoiceQuestion(source, allKeywords);
      const question2 = generator.generateMultipleChoiceQuestion(source, allKeywords);

      expect(question1.id).not.toBe(question2.id);
    });

    it('should include explanation in question', () => {
      const source = {
        sentence: 'Ribosomes synthesize proteins.',
        keywords: ['ribosomes', 'proteins'],
        sourceDocument: '/path/to/doc.pdf'
      };
      const allKeywords = ['ribosomes', 'proteins', 'nucleus', 'membrane', 'cytoplasm'];

      const question = generator.generateMultipleChoiceQuestion(source, allKeywords);

      expect(question).toBeDefined();
      expect(question.explanation).toContain('correct answer');
    });
  });

  describe('generateQuestions', () => {
    it('should generate multiple questions from documents', () => {
      const documents = [
        {
          filePath: '/path/to/biology.pdf',
          content: 'Mitochondria mitochondria produce energy energy. Chloroplasts chloroplasts perform photosynthesis photosynthesis. The nucleus nucleus contains DNA. Ribosomes ribosomes synthesize proteins proteins.',
          metadata: { title: 'Biology' }
        }
      ];

      const questions = generator.generateQuestions(documents, 10);

      expect(questions).toBeDefined();
      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThan(0);
    });

    it('should return empty array for empty documents', () => {
      const questions = generator.generateQuestions([], 10);
      expect(questions).toEqual([]);
    });

    it('should return empty array for null input', () => {
      const questions = generator.generateQuestions(null, 10);
      expect(questions).toEqual([]);
    });

    it('should respect maxQuestions parameter', () => {
      const documents = [
        {
          filePath: '/path/to/doc.pdf',
          content: 'Biology biology biology chemistry chemistry chemistry physics physics physics mathematics mathematics mathematics. Science science science technology technology technology engineering engineering engineering medicine medicine medicine.',
          metadata: { title: 'Science' }
        }
      ];

      const questions = generator.generateQuestions(documents, 3);

      expect(questions.length).toBeLessThanOrEqual(3);
    });

    it('should generate questions with all required properties', () => {
      const documents = [
        {
          filePath: '/path/to/biology.pdf',
          content: 'Mitochondria mitochondria produce energy energy through cellular respiration respiration. Chloroplasts chloroplasts perform photosynthesis photosynthesis in plants plants. The nucleus nucleus contains genetic material material.',
          metadata: { title: 'Biology' }
        }
      ];

      const questions = generator.generateQuestions(documents, 5);

      questions.forEach(question => {
        expect(question.id).toBeDefined();
        expect(question.text).toBeDefined();
        expect(question.type).toBe('multiple-choice');
        expect(question.options).toBeDefined();
        expect(question.options.length).toBeGreaterThanOrEqual(3);
        expect(question.correctAnswer).toBeDefined();
        expect(question.correctAnswer).toBeGreaterThanOrEqual(0);
        expect(question.correctAnswer).toBeLessThan(question.options.length);
        expect(question.explanation).toBeDefined();
        expect(question.sourceDocument).toBeDefined();
      });
    });

    it('should handle multiple documents', () => {
      const documents = [
        {
          filePath: '/path/to/biology.pdf',
          content: 'Mitochondria mitochondria produce energy energy. Chloroplasts chloroplasts perform photosynthesis photosynthesis.',
          metadata: { title: 'Biology' }
        },
        {
          filePath: '/path/to/chemistry.pdf',
          content: 'Atoms atoms form molecules molecules. Chemical chemical reactions reactions occur.',
          metadata: { title: 'Chemistry' }
        }
      ];

      const questions = generator.generateQuestions(documents, 10);

      expect(questions.length).toBeGreaterThan(0);
      
      // Should have questions from both documents
      const sources = [...new Set(questions.map(q => q.sourceDocument))];
      expect(sources.length).toBeGreaterThan(0);
    });

    it('should skip questions that cannot be generated', () => {
      const documents = [
        {
          filePath: '/path/to/short.pdf',
          content: 'Short text.',
          metadata: { title: 'Short' }
        }
      ];

      const questions = generator.generateQuestions(documents, 10);

      // Should handle gracefully and return empty or fewer questions
      expect(Array.isArray(questions)).toBe(true);
    });

    it('should generate grammatically correct questions', () => {
      const documents = [
        {
          filePath: '/path/to/biology.pdf',
          content: 'Photosynthesis photosynthesis occurs in chloroplasts chloroplasts. Mitochondria mitochondria produce energy energy. The nucleus nucleus contains DNA.',
          metadata: { title: 'Biology' }
        }
      ];

      const questions = generator.generateQuestions(documents, 5);

      questions.forEach(question => {
        // Should end with question mark
        expect(question.text).toMatch(/\?$/);
        // Should contain a blank
        expect(question.text).toContain('______');
        // Should start with capital letter
        expect(question.text.charAt(0)).toBe(question.text.charAt(0).toUpperCase());
      });
    });
  });

  describe('integration tests', () => {
    it('should extract meaningful keywords from biology text', () => {
      const content = `
        Photosynthesis is the process by which plants convert light energy into chemical energy.
        Chlorophyll, the green pigment in plants, absorbs light energy.
        During photosynthesis, carbon dioxide and water are converted into glucose and oxygen.
        The process of photosynthesis occurs in the chloroplasts of plant cells.
        Chloroplasts contain chlorophyll which gives plants their green color.
      `;

      const keywords = generator.extractKeywords(content);

      // Should identify key biology terms
      const keywordWords = keywords.map(k => k.word);
      expect(keywordWords).toContain('photosynthesis');
      expect(keywordWords).toContain('chlorophyll');
    });

    it('should extract relevant sentences for question generation', () => {
      const content = `
        The mitochondria is known as the powerhouse of the cell.
        It produces ATP through cellular respiration.
        Mitochondria have their own DNA, separate from nuclear DNA.
        This suggests that mitochondria were once independent organisms.
      `;

      const keywords = generator.extractKeywords(content);
      const keywordWords = keywords.map(k => k.word);
      const sentences = generator.extractSentencesWithKeywords(content, keywordWords);

      expect(sentences.length).toBeGreaterThan(0);
      // Sentences should be substantial enough for questions
      sentences.forEach(sentence => {
        expect(sentence.length).toBeGreaterThan(20);
      });
    });

    it('should handle real-world document structure', () => {
      const document = {
        filePath: '/path/to/biology-chapter1.pdf',
        content: `
          Chapter 1: Introduction to Cell Biology
          
          Cells are the basic unit of life. All living organisms are composed of cells.
          There are two main types of cells: prokaryotic and eukaryotic cells.
          
          Prokaryotic cells are simpler and lack a nucleus. Bacteria are prokaryotic cells.
          Eukaryotic cells have a nucleus and membrane-bound organelles.
          
          The cell membrane controls what enters and exits the cell.
          The nucleus contains the cell's genetic material in the form of DNA.
          Mitochondria produce energy for the cell through cellular respiration.
        `,
        metadata: {
          title: 'Introduction to Cell Biology',
          wordCount: 95
        }
      };

      const concepts = generator.identifyKeyConcepts(document);

      expect(concepts.keywords.length).toBeGreaterThan(0);
      expect(concepts.sourceSentences.length).toBeGreaterThan(0);
      
      // Should identify important biology terms
      const keywordWords = concepts.keywords.map(k => k.word);
      expect(keywordWords.some(w => ['cells', 'cell', 'nucleus', 'mitochondria'].includes(w))).toBe(true);
    });

    it('should generate complete questions from real-world biology content', () => {
      const documents = [
        {
          filePath: '/path/to/biology.pdf',
          content: `
            Photosynthesis is the process by which plants convert light energy into chemical energy.
            Chlorophyll, the green pigment in plants, absorbs light energy during photosynthesis.
            During photosynthesis, carbon dioxide and water are converted into glucose and oxygen.
            The process of photosynthesis occurs in the chloroplasts of plant cells.
            Mitochondria are known as the powerhouse of the cell because they produce ATP.
            Cellular respiration is the process by which cells break down glucose to produce energy.
            The nucleus contains the cell's genetic material in the form of DNA.
            Ribosomes are responsible for protein synthesis in the cell.
          `,
          metadata: {
            title: 'Cell Biology and Photosynthesis',
            wordCount: 120
          }
        }
      ];

      const questions = generator.generateQuestions(documents, 5);

      expect(questions.length).toBeGreaterThan(0);

      // Verify question quality
      questions.forEach(question => {
        // Has all required properties
        expect(question.id).toBeDefined();
        expect(question.text).toBeDefined();
        expect(question.type).toBe('multiple-choice');
        expect(question.options.length).toBeGreaterThanOrEqual(3);
        expect(question.correctAnswer).toBeGreaterThanOrEqual(0);
        expect(question.correctAnswer).toBeLessThan(question.options.length);

        // Question is grammatically correct
        expect(question.text).toMatch(/\?$/);
        expect(question.text).toContain('______');
        expect(question.text.charAt(0)).toBe(question.text.charAt(0).toUpperCase());

        // Options are valid
        question.options.forEach(option => {
          expect(option).toBeDefined();
          expect(option.length).toBeGreaterThan(0);
          expect(option.charAt(0)).toBe(option.charAt(0).toUpperCase());
        });

        // Correct answer is valid
        const correctOption = question.options[question.correctAnswer];
        expect(correctOption).toBeDefined();

        // Has explanation
        expect(question.explanation).toContain('correct answer');
        expect(question.explanation).toContain(correctOption);
      });
    });

    it('should generate diverse questions from multiple topics', () => {
      const documents = [
        {
          filePath: '/path/to/biology.pdf',
          content: `
            Mitochondria mitochondria produce energy energy through cellular cellular respiration respiration.
            Chloroplasts chloroplasts perform photosynthesis photosynthesis in plant plant cells cells.
            The nucleus nucleus contains genetic genetic material material.
            Ribosomes ribosomes synthesize proteins proteins in the cell cell.
          `,
          metadata: { title: 'Biology' }
        }
      ];

      const questions = generator.generateQuestions(documents, 10);

      expect(questions.length).toBeGreaterThan(0);

      // Questions should cover different topics
      const questionTexts = questions.map(q => q.text.toLowerCase());
      const topics = ['mitochondria', 'chloroplast', 'nucleus', 'ribosome'];
      
      // Should have questions about different organelles
      const coveredTopics = topics.filter(topic => 
        questionTexts.some(text => text.includes(topic))
      );
      
      expect(coveredTopics.length).toBeGreaterThan(1);
    });

    it('should ensure distractors are plausible', () => {
      const documents = [
        {
          filePath: '/path/to/biology.pdf',
          content: `
            Mitochondria mitochondria produce energy energy.
            Chloroplasts chloroplasts perform photosynthesis photosynthesis.
            The nucleus nucleus contains DNA.
            Ribosomes ribosomes synthesize proteins proteins.
            The membrane membrane controls transport transport.
          `,
          metadata: { title: 'Cell Biology' }
        }
      ];

      const questions = generator.generateQuestions(documents, 5);

      questions.forEach(question => {
        // All options should be capitalized
        question.options.forEach(option => {
          expect(option.charAt(0)).toBe(option.charAt(0).toUpperCase());
        });

        // Options should be distinct
        const uniqueOptions = [...new Set(question.options.map(o => o.toLowerCase()))];
        expect(uniqueOptions.length).toBe(question.options.length);

        // All options should be substantial (not too short)
        question.options.forEach(option => {
          expect(option.length).toBeGreaterThanOrEqual(4);
        });
      });
    });
  });
});
