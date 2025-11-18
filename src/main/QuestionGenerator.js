/**
 * @typedef {Object} DocumentContent
 * @property {string} filePath - Path to the document
 * @property {string} content - Extracted text content
 * @property {Object} metadata - Document metadata
 */

/**
 * @typedef {Object} Keyword
 * @property {string} word - The keyword
 * @property {number} frequency - Number of occurrences
 * @property {number} score - Relevance score
 */

/**
 * @typedef {Object} QuestionSource
 * @property {string} sentence - The source sentence
 * @property {string[]} keywords - Keywords found in the sentence
 * @property {string} sourceDocument - Path to source document
 */

/**
 * @typedef {Object} Question
 * @property {string} id - Unique question identifier
 * @property {string} text - The question text
 * @property {string} type - Question type ('multiple-choice')
 * @property {string[]} options - Array of answer options
 * @property {number} correctAnswer - Index of correct answer
 * @property {string} explanation - Explanation of the correct answer
 * @property {string} sourceDocument - Path to source document
 */

/**
 * Generates educational questions from processed documents
 */
class QuestionGenerator {
  /**
   * @param {Object} [options] - Configuration options
   * @param {number} [options.minKeywordLength] - Minimum keyword length (default: 4)
   * @param {number} [options.maxKeywords] - Maximum keywords to extract (default: 20)
   * @param {number} [options.minKeywordFrequency] - Minimum frequency for a keyword (default: 2)
   * @param {string} [options.cachePath] - Path to cache file (default: questions.json in user data)
   * @param {number} [options.maxCachedQuestions] - Maximum questions to keep in memory (default: 100)
   * @param {boolean} [options.lazyLoad] - Enable lazy loading of questions (default: true)
   */
  constructor(options = {}) {
    this.minKeywordLength = options.minKeywordLength || 4;
    this.maxKeywords = options.maxKeywords || 20;
    this.minKeywordFrequency = options.minKeywordFrequency || 2;
    this.maxCachedQuestions = options.maxCachedQuestions || 100;
    this.lazyLoad = options.lazyLoad !== false; // Default to true
    
    // Cache and session management
    const fs = require('fs');
    const path = require('path');
    const { app } = require('electron');
    
    // Determine cache path
    if (options.cachePath) {
      this.cachePath = options.cachePath;
    } else {
      // Use app.getPath if available (in Electron context), otherwise use current directory
      try {
        const userDataPath = app ? app.getPath('userData') : '.';
        this.cachePath = path.join(userDataPath, 'questions.json');
      } catch (error) {
        // Fallback for testing environment
        this.cachePath = path.join('.', 'questions.json');
      }
    }
    
    this.fs = fs;
    this.path = path;
    
    // In-memory cache
    this.cachedQuestions = [];
    this.usedQuestionIds = new Set();
    this.cacheMetadata = {
      generated: null,
      documentHashes: []
    };
    
    // Lazy loading state
    this.cacheLoaded = false;
    
    // Common stop words to filter out
    this.stopWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
      'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go',
      'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
      'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them',
      'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
      'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work',
      'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
      'give', 'day', 'most', 'us', 'is', 'was', 'are', 'been', 'has', 'had',
      'were', 'said', 'did', 'having', 'may', 'should', 'does', 'being'
    ]);
  }

  /**
   * Extract keywords from document content using frequency analysis
   * @param {string} content - Document text content
   * @returns {Keyword[]} - Array of keywords sorted by relevance score
   */
  extractKeywords(content) {
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return [];
    }

    // Tokenize: split into words and normalize
    const words = content
      .toLowerCase()
      .replace(/[^\w\s'-]/g, ' ') // Keep hyphens and apostrophes
      .split(/\s+/)
      .filter(word => word.length >= this.minKeywordLength)
      .filter(word => !this.stopWords.has(word))
      .filter(word => !/^\d+$/.test(word)); // Filter out pure numbers

    // Count word frequencies
    const frequencyMap = new Map();
    words.forEach(word => {
      frequencyMap.set(word, (frequencyMap.get(word) || 0) + 1);
    });

    // Filter by minimum frequency and calculate scores
    const keywords = Array.from(frequencyMap.entries())
      .filter(([_, frequency]) => frequency >= this.minKeywordFrequency)
      .map(([word, frequency]) => {
        // Score based on frequency and word length
        // Longer words tend to be more specific/important
        const lengthBonus = Math.min(word.length / 10, 1.5);
        const score = frequency * lengthBonus;
        
        return {
          word,
          frequency,
          score
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, this.maxKeywords);

    return keywords;
  }

  /**
   * Extract sentences containing specific keywords
   * @param {string} content - Document text content
   * @param {string[]} keywords - Keywords to search for
   * @returns {string[]} - Array of sentences containing keywords
   */
  extractSentencesWithKeywords(content, keywords) {
    if (!content || !keywords || keywords.length === 0) {
      return [];
    }

    // Split content into sentences
    // Handle common sentence endings: . ! ? and also handle abbreviations
    const sentences = content
      .replace(/([.!?])\s+/g, '$1|')
      .split('|')
      .map(s => s.trim())
      .filter(s => s.length > 20); // Filter out very short sentences

    // Create keyword set for efficient lookup (case-insensitive)
    const keywordSet = new Set(keywords.map(k => k.toLowerCase()));

    // Find sentences containing keywords
    const matchingSentences = [];
    
    sentences.forEach(sentence => {
      const sentenceWords = sentence
        .toLowerCase()
        .replace(/[^\w\s'-]/g, ' ')
        .split(/\s+/);
      
      // Check if sentence contains any keywords
      const foundKeywords = sentenceWords.filter(word => keywordSet.has(word));
      
      if (foundKeywords.length > 0) {
        matchingSentences.push({
          sentence,
          keywords: foundKeywords,
          keywordCount: foundKeywords.length
        });
      }
    });

    // Sort by number of keywords (sentences with more keywords are more relevant)
    matchingSentences.sort((a, b) => b.keywordCount - a.keywordCount);

    return matchingSentences.map(item => item.sentence);
  }

  /**
   * Identify key concepts from a document
   * @param {DocumentContent} document - Processed document
   * @returns {Object} - Key concepts with keywords and source sentences
   */
  identifyKeyConcepts(document) {
    if (!document || !document.content) {
      return {
        keywords: [],
        sourceSentences: [],
        documentPath: document?.filePath || 'unknown'
      };
    }

    // Extract keywords
    const keywords = this.extractKeywords(document.content);

    // Extract sentences containing these keywords
    const keywordStrings = keywords.map(k => k.word);
    const sourceSentences = this.extractSentencesWithKeywords(
      document.content,
      keywordStrings
    );

    // Create question sources with metadata
    const questionSources = sourceSentences.slice(0, 50).map(sentence => ({
      sentence,
      keywords: keywordStrings.filter(kw => 
        sentence.toLowerCase().includes(kw.toLowerCase())
      ),
      sourceDocument: document.filePath
    }));

    return {
      keywords,
      sourceSentences: questionSources,
      documentPath: document.filePath,
      documentTitle: document.metadata?.title || 'Unknown'
    };
  }

  /**
   * Process multiple documents and extract key concepts from all
   * @param {DocumentContent[]} documents - Array of processed documents
   * @returns {Map<string, Object>} - Map of document paths to key concepts
   */
  processDocuments(documents) {
    if (!Array.isArray(documents) || documents.length === 0) {
      return new Map();
    }

    const conceptsMap = new Map();

    documents.forEach(document => {
      try {
        const concepts = this.identifyKeyConcepts(document);
        conceptsMap.set(document.filePath, concepts);
      } catch (error) {
        console.error(`Error processing document ${document.filePath}:`, error);
        // Continue with other documents
      }
    });

    return conceptsMap;
  }

  /**
   * Get statistics about extracted keywords across all documents
   * @param {DocumentContent[]} documents - Array of processed documents
   * @returns {Object} - Statistics about keyword extraction
   */
  getKeywordStatistics(documents) {
    if (!Array.isArray(documents) || documents.length === 0) {
      return {
        totalDocuments: 0,
        totalKeywords: 0,
        totalSourceSentences: 0,
        averageKeywordsPerDocument: 0,
        averageSentencesPerDocument: 0
      };
    }

    const conceptsMap = this.processDocuments(documents);
    let totalKeywords = 0;
    let totalSentences = 0;

    conceptsMap.forEach(concepts => {
      totalKeywords += concepts.keywords.length;
      totalSentences += concepts.sourceSentences.length;
    });

    return {
      totalDocuments: documents.length,
      totalKeywords,
      totalSourceSentences: totalSentences,
      averageKeywordsPerDocument: totalKeywords / documents.length,
      averageSentencesPerDocument: totalSentences / documents.length
    };
  }

  /**
   * Generate a question from a sentence by replacing a keyword with a blank
   * @param {string} sentence - Source sentence
   * @param {string[]} keywords - Keywords in the sentence
   * @returns {Object|null} - Question text and correct answer, or null if generation fails
   */
  generateQuestionFromSentence(sentence, keywords) {
    if (!sentence || !keywords || keywords.length === 0) {
      return null;
    }

    // Find the most important keyword in the sentence (longest one)
    const sortedKeywords = keywords
      .filter(kw => sentence.toLowerCase().includes(kw.toLowerCase()))
      .sort((a, b) => b.length - a.length);

    if (sortedKeywords.length === 0) {
      return null;
    }

    const targetKeyword = sortedKeywords[0];

    // Find the keyword in the sentence (case-insensitive)
    const regex = new RegExp(`\\b${targetKeyword}\\b`, 'i');
    const match = sentence.match(regex);

    if (!match) {
      return null;
    }

    let correctAnswer = match[0].trim(); // Preserve original case
    
    // Ensure correct answer is properly capitalized (first letter uppercase)
    if (correctAnswer.length > 0) {
      correctAnswer = correctAnswer.charAt(0).toUpperCase() + correctAnswer.slice(1).toLowerCase();
    }

    // Replace the keyword with a blank
    const questionText = sentence.replace(regex, '______');

    // Ensure the question ends with a question mark
    let formattedQuestion = questionText.trim();
    if (!formattedQuestion.endsWith('?')) {
      // Remove trailing period if present
      if (formattedQuestion.endsWith('.')) {
        formattedQuestion = formattedQuestion.slice(0, -1);
      }
      formattedQuestion += '?';
    }

    // Add "What is" or "What are" prefix if the question doesn't start with a question word
    const questionWords = ['what', 'which', 'who', 'where', 'when', 'why', 'how'];
    const startsWithQuestionWord = questionWords.some(word => 
      formattedQuestion.toLowerCase().startsWith(word)
    );

    if (!startsWithQuestionWord) {
      // Simply add "What" prefix - the sentence structure should already be grammatical
      formattedQuestion = `What ${formattedQuestion}`;
    }

    return {
      questionText: formattedQuestion,
      correctAnswer: correctAnswer
    };
  }

  /**
   * Generate distractor options from document content
   * @param {string} correctAnswer - The correct answer
   * @param {string[]} allKeywords - All keywords from the document
   * @param {number} count - Number of distractors to generate (default: 3)
   * @returns {string[]} - Array of distractor options
   */
  generateDistractors(correctAnswer, allKeywords, count = 3) {
    if (!correctAnswer || !allKeywords || allKeywords.length === 0) {
      return [];
    }

    const correctLower = correctAnswer.toLowerCase();
    
    // Filter out the correct answer and find similar-length keywords
    const candidates = allKeywords
      .filter(kw => kw.toLowerCase() !== correctLower)
      .filter(kw => kw.length >= 4) // Ensure distractors are substantial
      .map(kw => {
        // Capitalize first letter to match typical answer format
        return kw.charAt(0).toUpperCase() + kw.slice(1);
      });

    // Remove duplicates (case-insensitive)
    const uniqueCandidates = [];
    const seen = new Set();
    candidates.forEach(candidate => {
      const lower = candidate.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        uniqueCandidates.push(candidate);
      }
    });

    // Shuffle and take the requested count
    const shuffled = uniqueCandidates.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Generate a multiple-choice question from a question source
   * @param {QuestionSource} source - Question source with sentence and keywords
   * @param {string[]} allKeywords - All keywords from the document for distractors
   * @returns {Question|null} - Generated question or null if generation fails
   */
  generateMultipleChoiceQuestion(source, allKeywords) {
    if (!source || !source.sentence || !source.keywords) {
      return null;
    }

    // Generate question text and correct answer
    const questionData = this.generateQuestionFromSentence(
      source.sentence,
      source.keywords
    );

    if (!questionData) {
      return null;
    }

    // Generate distractor options
    const distractors = this.generateDistractors(
      questionData.correctAnswer,
      allKeywords,
      3
    );

    // Need at least 2 distractors for a reasonable multiple-choice question
    if (distractors.length < 2) {
      return null;
    }

    // Combine correct answer with distractors
    const allOptions = [questionData.correctAnswer, ...distractors];

    // Shuffle options
    const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);

    // Find the index of the correct answer after shuffling
    const correctAnswerIndex = shuffledOptions.indexOf(questionData.correctAnswer);

    // Generate unique ID
    const id = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id,
      text: questionData.questionText,
      type: 'multiple-choice',
      options: shuffledOptions,
      correctAnswer: correctAnswerIndex,
      explanation: `The correct answer is "${questionData.correctAnswer}" based on the source material.`,
      sourceDocument: source.sourceDocument
    };
  }

  /**
   * Generate multiple questions from processed documents
   * @param {DocumentContent[]} documents - Array of processed documents
   * @param {number} maxQuestions - Maximum number of questions to generate (default: 20)
   * @returns {Question[]} - Array of generated questions
   * @throws {Error} - Throws error if question generation fails completely
   */
  generateQuestions(documents, maxQuestions = 20) {
    if (!Array.isArray(documents) || documents.length === 0) {
      throw new Error('No documents provided for question generation');
    }

    try {
      const questions = [];
      const conceptsMap = this.processDocuments(documents);

      if (conceptsMap.size === 0) {
        throw new Error('Failed to extract concepts from documents');
      }

      // Process each document
      conceptsMap.forEach((concepts) => {
        if (questions.length >= maxQuestions) {
          return;
        }

        const allKeywords = concepts.keywords.map(k => k.word);
        const sourceSentences = concepts.sourceSentences;

        // Try to generate questions from source sentences
        for (const source of sourceSentences) {
          if (questions.length >= maxQuestions) {
            break;
          }

          try {
            const question = this.generateMultipleChoiceQuestion(source, allKeywords);
            
            if (question) {
              questions.push(question);
            }
          } catch (error) {
            // Log error but continue with other sentences
            console.error('Error generating question from sentence:', error);
          }
        }
      });

      if (questions.length === 0) {
        throw new Error('Could not generate any valid questions from the provided documents');
      }

      return questions;
    } catch (error) {
      console.error('Error in generateQuestions:', error);
      throw error;
    }
  }

  /**
   * Load cached questions from disk
   * @param {boolean} [force] - Force reload even if already loaded
   * @returns {Promise<Object>} - Cache data with questions and metadata
   */
  async loadCache(force = false) {
    // Skip if already loaded and not forcing reload
    if (this.cacheLoaded && !force && this.lazyLoad) {
      return {
        questions: this.cachedQuestions,
        usedInSession: Array.from(this.usedQuestionIds),
        generated: this.cacheMetadata.generated,
        documentHashes: this.cacheMetadata.documentHashes
      };
    }

    try {
      // Check if cache file exists
      if (!this.fs.existsSync(this.cachePath)) {
        this.cacheLoaded = true;
        return {
          questions: [],
          usedInSession: [],
          generated: null,
          documentHashes: []
        };
      }

      // Read and parse cache file
      const cacheData = await this.fs.promises.readFile(this.cachePath, 'utf8');
      const parsed = JSON.parse(cacheData);

      // Validate cache structure
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid cache format');
      }

      // Load into memory with limit
      let questions = Array.isArray(parsed.questions) ? parsed.questions : [];
      
      // Apply memory limit
      if (questions.length > this.maxCachedQuestions) {
        console.log(`Limiting cached questions from ${questions.length} to ${this.maxCachedQuestions}`);
        questions = questions.slice(0, this.maxCachedQuestions);
      }

      this.cachedQuestions = questions;
      this.usedQuestionIds = new Set(Array.isArray(parsed.usedInSession) ? parsed.usedInSession : []);
      this.cacheMetadata = {
        generated: parsed.generated || null,
        documentHashes: Array.isArray(parsed.documentHashes) ? parsed.documentHashes : []
      };

      this.cacheLoaded = true;

      // Return normalized cache data
      return {
        questions: this.cachedQuestions,
        usedInSession: Array.from(this.usedQuestionIds),
        generated: this.cacheMetadata.generated,
        documentHashes: this.cacheMetadata.documentHashes
      };
    } catch (error) {
      // If cache is corrupted or doesn't exist, return empty cache
      console.error('Error loading question cache:', error);
      this.cacheLoaded = true;
      return {
        questions: [],
        usedInSession: [],
        generated: null,
        documentHashes: []
      };
    }
  }

  /**
   * Save questions to cache file
   * @param {Question[]} questions - Questions to cache
   * @param {string[]} documentPaths - Paths of source documents
   * @returns {Promise<void>}
   */
  async saveCache(questions, documentPaths = []) {
    try {
      // Ensure directory exists
      const cacheDir = this.path.dirname(this.cachePath);
      if (!this.fs.existsSync(cacheDir)) {
        await this.fs.promises.mkdir(cacheDir, { recursive: true });
      }

      // Apply memory limit to questions being saved
      let questionsToSave = questions || this.cachedQuestions;
      if (questionsToSave.length > this.maxCachedQuestions) {
        console.log(`Limiting saved questions from ${questionsToSave.length} to ${this.maxCachedQuestions}`);
        questionsToSave = questionsToSave.slice(0, this.maxCachedQuestions);
      }

      // Create cache data structure
      const cacheData = {
        generated: new Date().toISOString(),
        documentHashes: documentPaths,
        questions: questionsToSave,
        usedInSession: Array.from(this.usedQuestionIds)
      };

      // Write to file
      await this.fs.promises.writeFile(
        this.cachePath,
        JSON.stringify(cacheData, null, 2),
        'utf8'
      );

      // Update in-memory cache
      this.cachedQuestions = cacheData.questions;
      this.cacheMetadata = {
        generated: cacheData.generated,
        documentHashes: cacheData.documentHashes
      };
      this.cacheLoaded = true;

      return cacheData;
    } catch (error) {
      console.error('Error saving question cache:', error);
      throw error;
    }
  }

  /**
   * Clear cached questions from memory to free up resources
   */
  clearMemoryCache() {
    if (this.lazyLoad) {
      this.cachedQuestions = [];
      this.cacheLoaded = false;
      console.log('Memory cache cleared');
    }
  }

  /**
   * Get the next unused question from the cache
   * @returns {Promise<Question|null>} - Next unused question or null if none available
   */
  async getNextQuestion() {
    // Ensure cache is loaded (lazy loading)
    if (!this.cacheLoaded && this.lazyLoad) {
      await this.loadCache();
    }

    // Filter out used questions
    const unusedQuestions = this.cachedQuestions.filter(
      q => !this.usedQuestionIds.has(q.id)
    );

    if (unusedQuestions.length === 0) {
      return null;
    }

    // Return a random unused question
    const randomIndex = Math.floor(Math.random() * unusedQuestions.length);
    return unusedQuestions[randomIndex];
  }

  /**
   * Check if there are any questions available (used or unused)
   * @returns {boolean} - True if questions exist in cache
   */
  hasQuestions() {
    return this.cachedQuestions.length > 0;
  }

  /**
   * Check if there are unused questions available
   * @returns {boolean} - True if unused questions exist
   */
  hasUnusedQuestions() {
    const unusedCount = this.cachedQuestions.length - this.usedQuestionIds.size;
    return unusedCount > 0;
  }

  /**
   * Generate questions with fallback to cached questions
   * @param {DocumentContent[]} documents - Array of processed documents
   * @param {number} maxQuestions - Maximum number of questions to generate
   * @returns {Promise<{questions: Question[], usedCache: boolean, error: string|null}>}
   */
  async generateQuestionsWithFallback(documents, maxQuestions = 20) {
    try {
      // Try to generate new questions
      const questions = this.generateQuestions(documents, maxQuestions);
      
      // Save to cache
      const documentPaths = documents.map(d => d.filePath);
      await this.saveCache(questions, documentPaths);
      
      return {
        questions,
        usedCache: false,
        error: null
      };
    } catch (error) {
      console.error('Question generation failed, attempting to use cached questions:', error);
      
      // Try to load cached questions
      try {
        await this.loadCache();
        
        if (this.hasQuestions()) {
          console.log(`Using ${this.cachedQuestions.length} cached questions from previous session`);
          return {
            questions: this.cachedQuestions,
            usedCache: true,
            error: null
          };
        } else {
          // No cached questions available
          return {
            questions: [],
            usedCache: false,
            error: 'No questions could be generated and no cached questions are available. Please check your document configuration.'
          };
        }
      } catch (cacheError) {
        console.error('Failed to load cached questions:', cacheError);
        return {
          questions: [],
          usedCache: false,
          error: 'Question generation failed and cached questions could not be loaded. Please check your document configuration.'
        };
      }
    }
  }

  /**
   * Mark a question as used in the current session
   * @param {string} questionId - ID of the question to mark as used
   * @returns {boolean} - True if marked successfully, false if question not found
   */
  markQuestionUsed(questionId) {
    if (!questionId) {
      return false;
    }

    // Check if question exists in cache
    const questionExists = this.cachedQuestions.some(q => q.id === questionId);
    
    if (!questionExists) {
      return false;
    }

    // Add to used set
    this.usedQuestionIds.add(questionId);
    return true;
  }

  /**
   * Reset the session by clearing used questions
   * @returns {void}
   */
  resetSession() {
    this.usedQuestionIds.clear();
  }

  /**
   * Get session statistics
   * @returns {Object} - Statistics about current session
   */
  getSessionStats() {
    return {
      totalQuestions: this.cachedQuestions.length,
      usedQuestions: this.usedQuestionIds.size,
      remainingQuestions: this.cachedQuestions.length - this.usedQuestionIds.size,
      cacheGenerated: this.cacheMetadata.generated,
      documentCount: this.cacheMetadata.documentHashes.length
    };
  }

  /**
   * Check if cache needs regeneration based on document changes
   * @param {string[]} currentDocumentPaths - Current document paths
   * @returns {boolean} - True if cache should be regenerated
   */
  needsCacheRegeneration(currentDocumentPaths) {
    if (!this.cacheMetadata.generated) {
      return true;
    }

    // Check if document list has changed
    const currentSet = new Set(currentDocumentPaths);
    const cachedSet = new Set(this.cacheMetadata.documentHashes);

    if (currentSet.size !== cachedSet.size) {
      return true;
    }

    // Check if all documents match
    for (const doc of currentDocumentPaths) {
      if (!cachedSet.has(doc)) {
        return true;
      }
    }

    return false;
  }
}

module.exports = QuestionGenerator;
