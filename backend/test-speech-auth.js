const speech = require('@google-cloud/speech');
require('dotenv').config();

async function testSpeechAuth() {
  try {
    console.log('Testing Google Cloud Speech-to-Text authentication...');
    console.log('Credentials path:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    console.log('Full path:', require('path').resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS));
    
    const client = new speech.SpeechClient();
    
    // Test with minimal config - just to verify auth
    const request = {
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
      },
      audio: {
        content: Buffer.alloc(1024), // Dummy audio data for auth test
      },
    };

    const [response] = await client.recognize(request);
    console.log('✅ Authentication successful!');
    console.log('Google Cloud Speech-to-Text is ready to use.');
    
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    
    if (error.message.includes('ENOENT')) {
      console.error('📁 Check that the credentials file exists at:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    } else if (error.message.includes('UNAUTHENTICATED')) {
      console.error('🔐 Check that the service account has the correct permissions (roles/speech.client)');
    }
  }
}

testSpeechAuth();