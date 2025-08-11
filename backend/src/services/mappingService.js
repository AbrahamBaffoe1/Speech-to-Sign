const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');

class MappingService {
  constructor() {
    this.mappingData = null;
    this.vocabularyData = null;
    this.cdnBaseUrl = process.env.CDN_BASE_URL || 'https://your-cdn-domain.com/videos/';
    this.loadMappingData();
  }

  async loadMappingData() {
    try {
      // Load mapping.json
      const mappingPath = path.join(__dirname, '../../data/mapping.json');
      const mappingContent = await fs.readFile(mappingPath, 'utf8');
      this.mappingData = JSON.parse(mappingContent);
      
      // Load vocabulary.csv and convert to JSON structure
      const vocabularyPath = path.join(__dirname, '../../data/vocabulary.csv');
      const vocabularyContent = await fs.readFile(vocabularyPath, 'utf8');
      this.vocabularyData = this.parseCSVToJSON(vocabularyContent);
      
      logger.info('Mapping and vocabulary data loaded successfully');
      logger.info(`Loaded ${Object.keys(this.mappingData).length} mapping entries`);
      logger.info(`Loaded ${this.vocabularyData.length} vocabulary entries`);
    } catch (error) {
      logger.error('Failed to load mapping data:', error);
      // Create fallback mapping if files don't exist
      this.mappingData = this.createFallbackMapping();
      this.vocabularyData = [];
    }
  }

  parseCSVToJSON(csvContent) {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
      const values = this.parseCSVLine(line);
      const obj = {};
      headers.forEach((header, index) => {
        obj[header.trim()] = values[index]?.trim() || '';
      });
      return obj;
    });
  }

  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  async mapTextToSigns(text) {
    const startTime = Date.now();
    
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid text input');
      }

      // Normalize and clean the text
      const normalizedText = this.normalizeText(text);
      logger.info('Mapping text to signs:', { originalText: text, normalizedText });

      // Find matches in mapping data
      const matches = this.findMatches(normalizedText);
      
      // Generate video URLs and captions
      const result = {
        signs: matches.videoFiles.map(filename => ({
          url: this.cdnBaseUrl + filename,
          filename: filename,
          duration: this.getVideoDuration(filename)
        })),
        captions: matches.captions,
        confidence: matches.confidence,
        processingTime: Date.now() - startTime,
        matchedPhrases: matches.matchedPhrases
      };

      logger.info('Text mapping completed:', result);
      return result;
    } catch (error) {
      logger.error('Text mapping failed:', error);
      throw error;
    }
  }

  normalizeText(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  findMatches(text) {
    const matches = {
      videoFiles: [],
      captions: [],
      confidence: 0,
      matchedPhrases: []
    };

    if (!this.mappingData) {
      logger.warn('No mapping data available');
      return matches;
    }

    // Try exact match first
    if (this.mappingData[text]) {
      matches.videoFiles = [...this.mappingData[text]];
      matches.captions = [text];
      matches.confidence = 1.0;
      matches.matchedPhrases = [text];
      return matches;
    }

    // Try phrase matching (longer phrases first)
    const phrases = Object.keys(this.mappingData).sort((a, b) => b.length - a.length);
    const words = text.split(' ');
    let remainingText = text;
    let totalConfidence = 0;
    let matchCount = 0;

    for (const phrase of phrases) {
      if (remainingText.includes(phrase)) {
        matches.videoFiles.push(...this.mappingData[phrase]);
        matches.captions.push(phrase);
        matches.matchedPhrases.push(phrase);
        remainingText = remainingText.replace(phrase, '').trim();
        totalConfidence += 1.0;
        matchCount++;
      }
    }

    // Try individual word matching for remaining words
    const remainingWords = remainingText.split(' ').filter(word => word.length > 0);
    for (const word of remainingWords) {
      if (this.mappingData[word]) {
        matches.videoFiles.push(...this.mappingData[word]);
        matches.captions.push(word);
        matches.matchedPhrases.push(word);
        totalConfidence += 0.8; // Lower confidence for individual words
        matchCount++;
      }
    }

    // Calculate overall confidence
    const totalWords = words.length;
    matches.confidence = matchCount > 0 ? totalConfidence / totalWords : 0;

    // If no matches found, provide fallback
    if (matches.videoFiles.length === 0) {
      matches.videoFiles = ['NOT-UNDERSTAND.mp4'];
      matches.captions = ['I don\'t understand'];
      matches.confidence = 0.1;
      matches.matchedPhrases = ['fallback'];
    }

    return matches;
  }

  getVideoDuration(filename) {
    // Look up duration from vocabulary data
    if (this.vocabularyData) {
      const entry = this.vocabularyData.find(item => item.video_filename === filename);
      if (entry && entry.duration_ms) {
        return parseInt(entry.duration_ms);
      }
    }
    
    // Return default duration if not found
    return 2000; // 2 seconds default
  }

  async getVocabulary() {
    if (!this.vocabularyData) {
      await this.loadMappingData();
    }
    
    return this.vocabularyData.map(item => ({
      phrase: item.phrase,
      gloss: item.gloss,
      category: item.category,
      videoFile: item.video_filename,
      spokenVariants: item.spoken_variants ? item.spoken_variants.split(',') : [item.phrase],
      duration: parseInt(item.duration_ms) || 2000
    }));
  }

  createFallbackMapping() {
    logger.warn('Creating fallback mapping data');
    return {
      'hello': ['HELLO.mp4'],
      'hi': ['HELLO.mp4'],
      'thank you': ['THANK-YOU.mp4'],
      'thanks': ['THANK-YOU.mp4'],
      'yes': ['YES.mp4'],
      'no': ['NO.mp4'],
      'please': ['PLEASE.mp4'],
      'sorry': ['SORRY.mp4'],
      'help': ['HELP.mp4'],
      'stop': ['STOP.mp4'],
      'water': ['NEED-WATER.mp4'],
      'bathroom': ['BATHROOM.mp4'],
      'emergency': ['EMERGENCY.mp4']
    };
  }

  // Add new mapping entry (for dynamic updates)
  async addMapping(phrase, videoFiles) {
    try {
      if (!this.mappingData) {
        await this.loadMappingData();
      }
      
      const normalizedPhrase = this.normalizeText(phrase);
      this.mappingData[normalizedPhrase] = Array.isArray(videoFiles) ? videoFiles : [videoFiles];
      
      // Optionally save to file (be careful with file permissions in production)
      logger.info(`Added new mapping: ${normalizedPhrase} -> ${videoFiles}`);
      
      return true;
    } catch (error) {
      logger.error('Failed to add mapping:', error);
      return false;
    }
  }

  // Get mapping statistics
  getStats() {
    return {
      totalMappings: this.mappingData ? Object.keys(this.mappingData).length : 0,
      totalVocabulary: this.vocabularyData ? this.vocabularyData.length : 0,
      categories: this.vocabularyData ? 
        [...new Set(this.vocabularyData.map(item => item.category))] : [],
      cdnBaseUrl: this.cdnBaseUrl
    };
  }
}

module.exports = new MappingService();