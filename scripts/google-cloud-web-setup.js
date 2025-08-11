#!/usr/bin/env node

/**
 * Google Cloud Web-Based Setup Guide
 * Interactive script that guides you through Google Cloud setup via web console
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');

class GoogleCloudWebSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.keyFilePath = path.join(__dirname, '..', 'backend', '.gcp', 'speech-to-sign-key.json');
    this.backendDir = path.join(__dirname, '..', 'backend');
  }

  async prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m',   // Red
      reset: '\x1b[0m'     // Reset
    };
    
    console.log(`${colors[type]}[${type.toUpperCase()}]${colors.reset} ${message}`);
  }

  openURL(url) {
    const start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
    spawn(start, [url], { stdio: 'ignore', detached: true });
  }

  async displayInstructions() {
    console.clear();
    this.log('🚀 Google Cloud Speech-to-Text Setup Guide', 'info');
    console.log('='.repeat(50));
    
    this.log('This script will guide you through setting up Google Cloud credentials.', 'info');
    this.log('We\'ll open web pages for you to complete the setup.', 'info');
    
    await this.prompt('Press Enter to continue...');
    
    // Step 1: Create/Select Project
    console.log('\n📋 STEP 1: Create or Select Google Cloud Project');
    console.log('-'.repeat(50));
    this.log('1. We\'ll open the Google Cloud Console', 'info');
    this.log('2. Create a new project or select an existing one', 'info');
    this.log('3. Note down your Project ID (not the name)', 'info');
    
    const openConsole = await this.prompt('Open Google Cloud Console? (y/n): ');
    if (openConsole.toLowerCase() === 'y') {
      this.openURL('https://console.cloud.google.com/projectselector2');
      this.log('Opened Google Cloud Console in your browser', 'success');
    }
    
    const projectId = await this.prompt('Enter your Project ID: ');
    if (!projectId) {
      this.log('Project ID is required!', 'error');
      return false;
    }
    
    // Step 2: Enable APIs
    console.log('\n🔧 STEP 2: Enable Speech-to-Text API');
    console.log('-'.repeat(50));
    this.log('1. We\'ll open the APIs & Services page', 'info');
    this.log('2. Enable the "Cloud Speech-to-Text API"', 'info');
    
    const enableAPI = await this.prompt('Open APIs & Services page? (y/n): ');
    if (enableAPI.toLowerCase() === 'y') {
      this.openURL(`https://console.cloud.google.com/apis/library/speech.googleapis.com?project=${projectId}`);
      this.log('Opened Speech-to-Text API page in your browser', 'success');
    }
    
    await this.prompt('Press Enter after enabling the API...');
    
    // Step 3: Create Service Account
    console.log('\n👤 STEP 3: Create Service Account');
    console.log('-'.repeat(50));
    this.log('1. We\'ll open the IAM & Admin page', 'info');
    this.log('2. Click "Service Accounts" in the left menu', 'info');
    this.log('3. Click "+ CREATE SERVICE ACCOUNT"', 'info');
    this.log('4. Service account name: speech-to-sign-sa', 'info');
    this.log('5. Description: Service account for Speech-to-Sign app', 'info');
    this.log('6. Click "CREATE AND CONTINUE"', 'info');
    
    const openIAM = await this.prompt('Open IAM & Admin page? (y/n): ');
    if (openIAM.toLowerCase() === 'y') {
      this.openURL(`https://console.cloud.google.com/iam-admin/serviceaccounts?project=${projectId}`);
      this.log('Opened IAM & Admin Service Accounts page', 'success');
    }
    
    await this.prompt('Press Enter after creating the service account...');
    
    // Step 4: Assign Role
    console.log('\n🔐 STEP 4: Assign Role');
    console.log('-'.repeat(50));
    this.log('1. In the "Grant this service account access" section:', 'info');
    this.log('2. Search for and select: "Cloud Speech Client"', 'info');
    this.log('3. Click "CONTINUE"', 'info');
    this.log('4. Click "DONE" to finish creating', 'info');
    
    await this.prompt('Press Enter after assigning the role...');
    
    // Step 5: Create Key
    console.log('\n🔑 STEP 5: Create JSON Key');
    console.log('-'.repeat(50));
    this.log('1. Click on your newly created service account', 'info');
    this.log('2. Go to the "KEYS" tab', 'info');
    this.log('3. Click "ADD KEY" → "Create new key"', 'info');
    this.log('4. Select "JSON" format', 'info');
    this.log('5. Click "CREATE" - a JSON file will download', 'info');
    
    await this.prompt('Press Enter after downloading the JSON key...');
    
    return { projectId };
  }

  async setupKeyFile() {
    console.log('\n📁 STEP 6: Setup Key File');
    console.log('-'.repeat(50));
    
    // Ensure the .gcp directory exists
    const gcpDir = path.dirname(this.keyFilePath);
    if (!fs.existsSync(gcpDir)) {
      fs.mkdirSync(gcpDir, { recursive: true });
      this.log(`Created directory: ${gcpDir}`, 'info');
    }

    this.log(`Please copy your downloaded JSON key file to:`, 'info');
    this.log(`${this.keyFilePath}`, 'warning');
    
    this.log('\nThe file should be named: speech-to-sign-key.json', 'info');
    
    // Wait for user to copy the file
    while (true) {
      const copied = await this.prompt('Have you copied the file? (y/n): ');
      if (copied.toLowerCase() === 'y') {
        if (fs.existsSync(this.keyFilePath)) {
          try {
            // Validate the JSON file
            const keyContent = fs.readFileSync(this.keyFilePath, 'utf8');
            const keyData = JSON.parse(keyContent);
            
            if (keyData.type === 'service_account') {
              this.log('✓ Valid service account key detected!', 'success');
              return keyData.project_id;
            } else {
              this.log('Invalid key file format. Please check the file.', 'error');
            }
          } catch (error) {
            this.log(`Invalid JSON file: ${error.message}`, 'error');
            this.log('Please ensure you copied the correct JSON file.', 'warning');
          }
        } else {
          this.log('File not found. Please copy the JSON file to the correct location.', 'error');
        }
      } else {
        this.log('Please copy the JSON key file and try again.', 'info');
      }
    }
  }

  async updateEnvironmentFile(projectId) {
    try {
      const envFilePath = path.join(this.backendDir, '.env');
      const relativePath = './.gcp/speech-to-sign-key.json';
      
      if (!fs.existsSync(envFilePath)) {
        this.log('Creating .env file...', 'info');
        fs.writeFileSync(envFilePath, '');
      }

      let envContent = fs.readFileSync(envFilePath, 'utf8');
      
      // Update or add the Google credentials path
      const credentialsLine = `GOOGLE_APPLICATION_CREDENTIALS=${relativePath}`;
      const projectLine = `GOOGLE_CLOUD_PROJECT=${projectId}`;
      
      if (envContent.includes('GOOGLE_APPLICATION_CREDENTIALS=')) {
        envContent = envContent.replace(/GOOGLE_APPLICATION_CREDENTIALS=.*$/m, credentialsLine);
      } else {
        if (!envContent.endsWith('\n') && envContent.length > 0) {
          envContent += '\n';
        }
        envContent += `# Google Cloud Speech-to-Text\n${credentialsLine}\n`;
      }
      
      if (envContent.includes('GOOGLE_CLOUD_PROJECT=')) {
        envContent = envContent.replace(/GOOGLE_CLOUD_PROJECT=.*$/m, projectLine);
      } else {
        envContent += `${projectLine}\n`;
      }

      fs.writeFileSync(envFilePath, envContent);
      this.log(`✓ Environment file updated: ${envFilePath}`, 'success');
      return true;
    } catch (error) {
      this.log(`Failed to update environment file: ${error.message}`, 'error');
      return false;
    }
  }

  async testSetup() {
    console.log('\n🧪 STEP 7: Test Setup');
    console.log('-'.repeat(50));
    
    this.log('Testing the Google Cloud setup...', 'info');
    
    try {
      const testScript = path.join(this.backendDir, 'test-speech-auth.js');
      
      if (fs.existsSync(testScript)) {
        const { spawn } = require('child_process');
        
        return new Promise((resolve) => {
          const testProcess = spawn('node', [testScript], {
            cwd: this.backendDir,
            stdio: 'pipe'
          });
          
          let output = '';
          let errorOutput = '';
          
          testProcess.stdout.on('data', (data) => {
            output += data.toString();
          });
          
          testProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
          });
          
          testProcess.on('close', (code) => {
            if (code === 0 && output.includes('Authentication successful')) {
              this.log('✓ Google Cloud Speech-to-Text setup successful!', 'success');
              resolve(true);
            } else {
              this.log('Authentication test failed:', 'error');
              if (errorOutput) console.log(errorOutput);
              if (output) console.log(output);
              this.log('Setup completed but test failed. You may need to wait a few minutes for permissions to propagate.', 'warning');
              resolve(false);
            }
          });
          
          setTimeout(() => {
            testProcess.kill();
            this.log('Test timed out - this may be normal for first-time setup', 'warning');
            resolve(false);
          }, 15000);
        });
      } else {
        this.log('Test script not found, skipping test', 'warning');
        return true;
      }
    } catch (error) {
      this.log(`Test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async displayCompletionInfo() {
    console.log('\n🎉 Setup Complete!');
    console.log('='.repeat(50));
    this.log('Your Google Cloud Speech-to-Text is now configured!', 'success');
    
    console.log('\n📋 Next Steps:');
    this.log('1. Start your backend server: cd backend && npm start', 'info');
    this.log('2. Start your frontend: cd frontend && npm start', 'info');
    this.log('3. Test speech recognition in the web app', 'info');
    
    console.log('\n🔧 Files Created/Updated:');
    this.log(`- ${this.keyFilePath}`, 'info');
    this.log(`- ${path.join(this.backendDir, '.env')}`, 'info');
    
    console.log('\n⚠️  Security Notes:');
    this.log('- The JSON key file contains sensitive credentials', 'warning');
    this.log('- Never commit this file to version control', 'warning');
    this.log('- The file is already in .gitignore', 'info');
  }

  async cleanup() {
    this.rl.close();
  }

  async run() {
    try {
      const setupResult = await this.displayInstructions();
      if (!setupResult) {
        return false;
      }

      const keyProjectId = await this.setupKeyFile();
      
      await this.updateEnvironmentFile(keyProjectId || setupResult.projectId);
      
      await this.testSetup();
      
      await this.displayCompletionInfo();
      
      return true;
    } catch (error) {
      this.log(`Setup failed: ${error.message}`, 'error');
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  const setup = new GoogleCloudWebSetup();
  setup.run().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = GoogleCloudWebSetup;