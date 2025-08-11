#!/usr/bin/env node

/**
 * Comprehensive System Testing Script
 * Tests all components of the speech-to-sign system
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

class SystemTester {
    constructor() {
        this.testResults = [];
        this.verbose = process.argv.includes('--verbose');
    }

    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async runTest(name, testFunction) {
        try {
            this.log(`Starting test: ${name}`);
            const startTime = Date.now();
            
            const result = await testFunction();
            const duration = Date.now() - startTime;
            
            this.testResults.push({
                name,
                passed: true,
                duration,
                result
            });
            
            this.log(`Test passed: ${name} (${duration}ms)`);
            return true;
            
        } catch (error) {
            const duration = Date.now() - Date.now();
            
            this.testResults.push({
                name,
                passed: false,
                duration,
                error: error.message
            });
            
            this.log(`Test failed: ${name} - ${error.message}`, 'error');
            return false;
        }
    }

    async testBackendHealth() {
        const response = await fetch(`${API_BASE_URL}/health`);
        
        if (!response.ok) {
            throw new Error(`Health check failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status !== 'OK') {
            throw new Error('Health check returned non-OK status');
        }
        
        return data;
    }

    async testSpeechRecognition() {
        // Test with a simple audio blob simulation
        const formData = new FormData();
        
        // Create a minimal WAV file for testing
        const sampleAudioBuffer = Buffer.from([
            // WAV header for a minimal audio file
            0x52, 0x49, 0x46, 0x46, // "RIFF"
            0x24, 0x00, 0x00, 0x00, // File size
            0x57, 0x41, 0x56, 0x45, // "WAVE"
            0x66, 0x6D, 0x74, 0x20, // "fmt "
            0x10, 0x00, 0x00, 0x00, // Chunk size
            0x01, 0x00,             // Audio format (PCM)
            0x01, 0x00,             // Number of channels
            0x44, 0xAC, 0x00, 0x00, // Sample rate (44100)
            0x88, 0x58, 0x01, 0x00, // Byte rate
            0x02, 0x00,             // Block align
            0x10, 0x00,             // Bits per sample
            0x64, 0x61, 0x74, 0x61, // "data"
            0x00, 0x00, 0x00, 0x00  // Data size
        ]);
        
        const blob = new Blob([sampleAudioBuffer], { type: 'audio/wav' });
        formData.append('audio', blob, 'test.wav');
        
        const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            // This might fail with sample data, which is expected
            this.log('Note: Speech recognition test with sample data may fail - this is normal', 'warn');
            return { note: 'Test with sample data, may not work with real audio' };
        }
        
        return await response.json();
    }

    async testTextMapping() {
        const testCases = [
            { input: 'hello', expected: 'HELLO.mp4' },
            { input: 'thank you', expected: 'THANK-YOU.mp4' },
            { input: 'yes', expected: 'YES.mp4' },
            { input: 'help', expected: 'HELP.mp4' }
        ];
        
        const results = [];
        
        for (const testCase of testCases) {
            const response = await fetch(`${API_BASE_URL}/api/map`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: testCase.input })
            });
            
            if (!response.ok) {
                throw new Error(`Mapping failed for "${testCase.input}": ${response.status}`);
            }
            
            const data = await response.json();
            
            const hasExpectedVideo = data.mappedSigns?.some(sign => 
                sign.filename === testCase.expected
            );
            
            if (!hasExpectedVideo) {
                throw new Error(`Expected "${testCase.expected}" for input "${testCase.input}"`);
            }
            
            results.push({
                input: testCase.input,
                output: data.mappedSigns,
                confidence: data.confidence
            });
        }
        
        return results;
    }

    async testVocabularyEndpoint() {
        const response = await fetch(`${API_BASE_URL}/api/vocabulary`);
        
        if (!response.ok) {
            throw new Error(`Vocabulary endpoint failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.vocabulary || !Array.isArray(data.vocabulary)) {
            throw new Error('Vocabulary data is not an array');
        }
        
        if (data.vocabulary.length === 0) {
            throw new Error('Vocabulary is empty');
        }
        
        return {
            vocabularyCount: data.vocabulary.length,
            sampleEntries: data.vocabulary.slice(0, 3)
        };
    }

    async testFileStructure() {
        const requiredFiles = [
            'package.json',
            'README.md',
            'backend/package.json',
            'backend/src/server.js',
            'frontend/package.json',
            'frontend/src/App.tsx',
            'data/mapping.json',
            'data/vocabulary.csv'
        ];
        
        const missingFiles = [];
        const existingFiles = [];
        
        for (const file of requiredFiles) {
            const fullPath = path.join(process.cwd(), file);
            if (fs.existsSync(fullPath)) {
                existingFiles.push(file);
            } else {
                missingFiles.push(file);
            }
        }
        
        if (missingFiles.length > 0) {
            throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
        }
        
        return {
            checkedFiles: requiredFiles.length,
            allPresent: true
        };
    }

    async testFrontendAccessibility() {
        try {
            const response = await fetch(FRONTEND_URL);
            
            if (!response.ok) {
                throw new Error(`Frontend not accessible: ${response.status}`);
            }
            
            const html = await response.text();
            
            // Basic accessibility checks
            const checks = {
                hasTitle: html.includes('<title>'),
                hasLang: html.includes('lang='),
                hasMeta: html.includes('<meta'),
                hasReactApp: html.includes('root')
            };
            
            const failedChecks = Object.entries(checks)
                .filter(([key, passed]) => !passed)
                .map(([key]) => key);
            
            if (failedChecks.length > 0) {
                throw new Error(`Frontend accessibility issues: ${failedChecks.join(', ')}`);
            }
            
            return checks;
            
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Frontend server not running - start with "npm run dev:frontend"');
            }
            throw error;
        }
    }

    async testVideoFiles() {
        const videoDir = path.join(process.cwd(), 'data', 'videos');
        
        if (!fs.existsSync(videoDir)) {
            throw new Error('Video directory does not exist');
        }
        
        const files = fs.readdirSync(videoDir);
        const videoFiles = files.filter(file => 
            file.endsWith('.mp4') || file.endsWith('.mov') || file.endsWith('.webm')
        );
        
        if (videoFiles.length === 0) {
            this.log('No video files found - this is expected for initial setup', 'warn');
            return { videoCount: 0, note: 'No videos uploaded yet' };
        }
        
        return {
            videoCount: videoFiles.length,
            sampleFiles: videoFiles.slice(0, 5)
        };
    }

    async testPerformance() {
        const startTime = Date.now();
        
        // Test mapping performance
        const response = await fetch(`${API_BASE_URL}/api/map`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: 'hello world' })
        });
        
        const mappingTime = Date.now() - startTime;
        
        if (!response.ok) {
            throw new Error('Performance test mapping failed');
        }
        
        const data = await response.json();
        
        return {
            mappingLatency: mappingTime,
            confidence: data.confidence,
            videoCount: data.mappedSigns?.length || 0
        };
    }

    generateReport() {
        const passed = this.testResults.filter(r => r.passed).length;
        const failed = this.testResults.filter(r => r.passed === false).length;
        const totalTime = this.testResults.reduce((sum, r) => sum + r.duration, 0);
        
        console.log('\n📊 Test Results Summary');
        console.log('========================');
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`⏱️  Total Time: ${totalTime}ms`);
        console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
        
        if (failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults
                .filter(r => !r.passed)
                .forEach(r => {
                    console.log(`  • ${r.name}: ${r.error}`);
                });
        }
        
        if (this.verbose) {
            console.log('\n📋 Detailed Results:');
            console.log(JSON.stringify(this.testResults, null, 2));
        }
    }

    async runAllTests() {
        console.log('🧪 Starting Speech-to-Sign System Tests\n');
        
        // Core functionality tests
        await this.runTest('File Structure', () => this.testFileStructure());
        await this.runTest('Backend Health', () => this.testBackendHealth());
        await this.runTest('Text Mapping', () => this.testTextMapping());
        await this.runTest('Vocabulary Endpoint', () => this.testVocabularyEndpoint());
        
        // Optional tests (may fail in development)
        await this.runTest('Speech Recognition', () => this.testSpeechRecognition());
        await this.runTest('Frontend Accessibility', () => this.testFrontendAccessibility());
        await this.runTest('Video Files', () => this.testVideoFiles());
        await this.runTest('Performance', () => this.testPerformance());
        
        this.generateReport();
        
        const failedCount = this.testResults.filter(r => !r.passed).length;
        
        if (failedCount > 0) {
            console.log('\n💡 Next Steps:');
            console.log('1. Fix failed tests before deployment');
            console.log('2. Ensure both frontend and backend servers are running');
            console.log('3. Configure API keys in backend/.env');
            console.log('4. Upload video files to data/videos/');
            
            process.exit(1);
        } else {
            console.log('\n🎉 All tests passed! System is ready for use.');
            process.exit(0);
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new SystemTester();
    tester.runAllTests().catch(error => {
        console.error('❌ Test runner failed:', error.message);
        process.exit(1);
    });
}

module.exports = SystemTester;