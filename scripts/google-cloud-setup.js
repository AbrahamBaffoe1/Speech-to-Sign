#!/usr/bin/env node

/**
 * Google Cloud Automated Setup Script
 * This script automates the creation of:
 * 1. Google Cloud Service Account
 * 2. IAM Role Assignment (Speech Client)
 * 3. Service Account Key Generation
 * 4. Local credential file setup
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

class GoogleCloudSetup {
  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || null;
    this.serviceAccountName = 'speech-to-sign-sa';
    this.serviceAccountEmail = null;
    this.keyFilePath = path.join(__dirname, '..', 'backend', '.gcp', 'speech-to-sign-key.json');
    this.backendDir = path.join(__dirname, '..', 'backend');
    
    // Create readline interface for user input
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
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

  async checkGCloudCLI() {
    try {
      const version = execSync('gcloud version --format="value(Google Cloud SDK)"', { encoding: 'utf8' });
      this.log(`Google Cloud SDK detected: ${version.trim()}`, 'success');
      return true;
    } catch (error) {
      this.log('Google Cloud SDK not found!', 'error');
      this.log('Please install it from: https://cloud.google.com/sdk/docs/install', 'warning');
      this.log('After installation, run: gcloud auth login', 'warning');
      return false;
    }
  }

  async checkAuthentication() {
    try {
      const account = execSync('gcloud auth list --filter=status:ACTIVE --format="value(account)"', { encoding: 'utf8' });
      if (account.trim()) {
        this.log(`Authenticated as: ${account.trim()}`, 'success');
        return true;
      }
    } catch (error) {
      // Fall through to authentication prompt
    }
    
    this.log('Not authenticated with Google Cloud!', 'warning');
    const shouldAuth = await this.prompt('Do you want to authenticate now? (y/n): ');
    
    if (shouldAuth.toLowerCase() === 'y') {
      try {
        execSync('gcloud auth login', { stdio: 'inherit' });
        this.log('Authentication successful!', 'success');
        return true;
      } catch (error) {
        this.log('Authentication failed!', 'error');
        return false;
      }
    }
    
    return false;
  }

  async getProjectId() {
    if (!this.projectId) {
      try {
        this.projectId = execSync('gcloud config get-value project', { encoding: 'utf8' }).trim();
      } catch (error) {
        // No project configured
      }
    }

    if (!this.projectId) {
      this.log('No Google Cloud project configured!', 'warning');
      
      // List available projects
      try {
        this.log('Available projects:', 'info');
        execSync('gcloud projects list --format="table(projectId,name,projectNumber)"', { stdio: 'inherit' });
      } catch (error) {
        this.log('Could not list projects. Please ensure you have access to Google Cloud projects.', 'error');
      }
      
      this.projectId = await this.prompt('Enter your Google Cloud Project ID: ');
      
      if (!this.projectId) {
        this.log('Project ID is required!', 'error');
        return false;
      }
    }

    this.serviceAccountEmail = `${this.serviceAccountName}@${this.projectId}.iam.gserviceaccount.com`;
    this.log(`Using project: ${this.projectId}`, 'success');
    return true;
  }

  async enableAPIs() {
    this.log('Enabling required Google Cloud APIs...', 'info');
    
    const apis = [
      'speech.googleapis.com',
      'iam.googleapis.com',
      'cloudresourcemanager.googleapis.com'
    ];

    for (const api of apis) {
      try {
        this.log(`Enabling ${api}...`, 'info');
        execSync(`gcloud services enable ${api} --project=${this.projectId}`, { stdio: 'pipe' });
        this.log(`✓ ${api} enabled`, 'success');
      } catch (error) {
        this.log(`Failed to enable ${api}: ${error.message}`, 'error');
        return false;
      }
    }
    
    return true;
  }

  async createServiceAccount() {
    try {
      // Check if service account already exists
      try {
        execSync(`gcloud iam service-accounts describe ${this.serviceAccountEmail} --project=${this.projectId}`, { stdio: 'pipe' });
        this.log(`Service account ${this.serviceAccountEmail} already exists`, 'warning');
        return true;
      } catch (error) {
        // Service account doesn't exist, create it
      }

      this.log(`Creating service account: ${this.serviceAccountName}...`, 'info');
      
      const createCommand = `gcloud iam service-accounts create ${this.serviceAccountName} \
        --description="Service account for Speech-to-Sign application" \
        --display-name="Speech to Sign SA" \
        --project=${this.projectId}`;

      execSync(createCommand, { stdio: 'pipe' });
      this.log(`✓ Service account created: ${this.serviceAccountEmail}`, 'success');
      return true;
    } catch (error) {
      this.log(`Failed to create service account: ${error.message}`, 'error');
      return false;
    }
  }

  async assignRoles() {
    this.log('Assigning IAM roles...', 'info');
    
    const roles = [
      'roles/speech.client',
      'roles/speech.viewer'
    ];

    for (const role of roles) {
      try {
        this.log(`Assigning role: ${role}...`, 'info');
        
        const bindCommand = `gcloud projects add-iam-policy-binding ${this.projectId} \
          --member="serviceAccount:${this.serviceAccountEmail}" \
          --role="${role}"`;

        execSync(bindCommand, { stdio: 'pipe' });
        this.log(`✓ Role ${role} assigned`, 'success');
      } catch (error) {
        this.log(`Failed to assign role ${role}: ${error.message}`, 'error');
        return false;
      }
    }
    
    return true;
  }

  async createServiceAccountKey() {
    try {
      // Ensure the .gcp directory exists
      const gcpDir = path.dirname(this.keyFilePath);
      if (!fs.existsSync(gcpDir)) {
        fs.mkdirSync(gcpDir, { recursive: true });
        this.log(`Created directory: ${gcpDir}`, 'info');
      }

      // Delete existing key file if it exists
      if (fs.existsSync(this.keyFilePath)) {
        fs.unlinkSync(this.keyFilePath);
        this.log('Removed existing key file', 'info');
      }

      this.log('Creating service account key...', 'info');
      
      const keyCommand = `gcloud iam service-accounts keys create "${this.keyFilePath}" \
        --iam-account="${this.serviceAccountEmail}" \
        --project=${this.projectId}`;

      execSync(keyCommand, { stdio: 'pipe' });
      
      // Verify the key was created and is valid JSON
      if (fs.existsSync(this.keyFilePath)) {
        try {
          const keyContent = fs.readFileSync(this.keyFilePath, 'utf8');
          const keyData = JSON.parse(keyContent);
          
          if (keyData.type === 'service_account' && keyData.project_id === this.projectId) {
            this.log(`✓ Service account key created: ${this.keyFilePath}`, 'success');
            return true;
          } else {
            this.log('Invalid key file format', 'error');
            return false;
          }
        } catch (error) {
          this.log(`Invalid JSON in key file: ${error.message}`, 'error');
          return false;
        }
      } else {
        this.log('Key file was not created', 'error');
        return false;
      }
    } catch (error) {
      this.log(`Failed to create service account key: ${error.message}`, 'error');
      return false;
    }
  }

  async updateEnvironmentFile() {
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
      
      if (envContent.includes('GOOGLE_APPLICATION_CREDENTIALS=')) {
        // Replace existing line
        envContent = envContent.replace(/GOOGLE_APPLICATION_CREDENTIALS=.*$/m, credentialsLine);
        this.log('Updated GOOGLE_APPLICATION_CREDENTIALS in .env', 'info');
      } else {
        // Add new line
        if (!envContent.endsWith('\n') && envContent.length > 0) {
          envContent += '\n';
        }
        envContent += `# Google Cloud Speech-to-Text\n${credentialsLine}\n`;
        this.log('Added GOOGLE_APPLICATION_CREDENTIALS to .env', 'info');
      }

      fs.writeFileSync(envFilePath, envContent);
      this.log(`✓ Environment file updated: ${envFilePath}`, 'success');
      return true;
    } catch (error) {
      this.log(`Failed to update environment file: ${error.message}`, 'error');
      return false;
    }
  }

  async testAuthentication() {
    this.log('Testing authentication...', 'info');
    
    try {
      // Change to backend directory for testing
      const originalDir = process.cwd();
      process.chdir(this.backendDir);
      
      // Test using the authentication script we created earlier
      const testScript = path.join(this.backendDir, 'test-speech-auth.js');
      
      if (fs.existsSync(testScript)) {
        try {
          execSync('node test-speech-auth.js', { stdio: 'pipe', timeout: 10000 });
          this.log('✓ Google Cloud Speech-to-Text authentication successful!', 'success');
          return true;
        } catch (error) {
          this.log(`Authentication test failed: ${error.message}`, 'error');
          return false;
        } finally {
          process.chdir(originalDir);
        }
      } else {
        this.log('Test script not found, skipping authentication test', 'warning');
        return true;
      }
    } catch (error) {
      this.log(`Test execution failed: ${error.message}`, 'error');
      return false;
    }
  }

  async cleanup() {
    this.rl.close();
  }

  async run() {
    try {
      this.log('🚀 Starting Google Cloud automated setup...', 'info');
      
      // Check prerequisites
      if (!(await this.checkGCloudCLI())) {
        return false;
      }
      
      if (!(await this.checkAuthentication())) {
        return false;
      }
      
      if (!(await this.getProjectId())) {
        return false;
      }

      // Setup process
      if (!(await this.enableAPIs())) {
        return false;
      }
      
      if (!(await this.createServiceAccount())) {
        return false;
      }
      
      if (!(await this.assignRoles())) {
        return false;
      }
      
      if (!(await this.createServiceAccountKey())) {
        return false;
      }
      
      if (!(await this.updateEnvironmentFile())) {
        return false;
      }
      
      if (!(await this.testAuthentication())) {
        this.log('Setup completed but authentication test failed', 'warning');
        this.log('You may need to wait a few minutes for permissions to propagate', 'info');
      }

      this.log('🎉 Google Cloud setup completed successfully!', 'success');
      this.log('You can now start your backend server with: npm start', 'info');
      
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
  const setup = new GoogleCloudSetup();
  setup.run().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = GoogleCloudSetup;