#!/usr/bin/env node

/**
 * AWS S3 Setup Script for Sign Language Videos
 * Sets up S3 bucket, CloudFront distribution, and uploads videos
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

const PROJECT_ROOT = path.join(__dirname, '..');
const VIDEO_DIR = path.join(PROJECT_ROOT, 'data', 'videos');
const CONFIG_FILE = path.join(PROJECT_ROOT, 'aws-config.json');

class S3VideoSetup {
    constructor() {
        this.s3 = null;
        this.cloudfront = null;
        this.config = this.loadConfig();
    }

    loadConfig() {
        try {
            if (fs.existsSync(CONFIG_FILE)) {
                return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            }
        } catch (error) {
            console.log('📝 No existing AWS config found, will create new one');
        }
        
        return {
            region: 'us-east-1',
            bucketName: 'speech-to-sign-videos-' + Date.now(),
            cloudfrontDistribution: null,
            cdnUrl: null
        };
    }

    saveConfig() {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
        console.log(`✅ Configuration saved to ${CONFIG_FILE}`);
    }

    initializeAWS() {
        try {
            // Initialize AWS SDK
            AWS.config.update({
                region: this.config.region,
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            });

            this.s3 = new AWS.S3();
            this.cloudfront = new AWS.CloudFront();
            
            console.log('✅ AWS SDK initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize AWS:', error.message);
            console.log('\n🔧 Please ensure AWS credentials are set:');
            console.log('export AWS_ACCESS_KEY_ID=your_access_key');
            console.log('export AWS_SECRET_ACCESS_KEY=your_secret_key');
            console.log('\nOr add them to backend/.env file');
            return false;
        }
    }

    async createS3Bucket() {
        try {
            console.log(`📦 Creating S3 bucket: ${this.config.bucketName}`);
            
            // Check if bucket exists
            try {
                await this.s3.headBucket({ Bucket: this.config.bucketName }).promise();
                console.log('✅ S3 bucket already exists');
                return true;
            } catch (error) {
                if (error.statusCode !== 404) {
                    throw error;
                }
            }

            // Create bucket
            const params = {
                Bucket: this.config.bucketName,
                ACL: 'private'
            };

            if (this.config.region !== 'us-east-1') {
                params.CreateBucketConfiguration = {
                    LocationConstraint: this.config.region
                };
            }

            await this.s3.createBucket(params).promise();
            
            // Configure bucket for web hosting
            await this.s3.putBucketCors({
                Bucket: this.config.bucketName,
                CORSConfiguration: {
                    CORSRules: [{
                        AllowedHeaders: ['*'],
                        AllowedMethods: ['GET', 'HEAD'],
                        AllowedOrigins: ['*'],
                        MaxAgeSeconds: 3000
                    }]
                }
            }).promise();

            console.log('✅ S3 bucket created and configured');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to create S3 bucket:', error.message);
            return false;
        }
    }

    async createCloudFrontDistribution() {
        try {
            if (this.config.cloudfrontDistribution) {
                console.log('✅ CloudFront distribution already exists');
                return true;
            }

            console.log('🌐 Creating CloudFront distribution...');
            
            const params = {
                DistributionConfig: {
                    CallerReference: `speech-to-sign-${Date.now()}`,
                    DefaultRootObject: '',
                    Comment: 'Speech to Sign Language Videos CDN',
                    Enabled: true,
                    Origins: {
                        Quantity: 1,
                        Items: [{
                            Id: 'S3Origin',
                            DomainName: `${this.config.bucketName}.s3.amazonaws.com`,
                            S3OriginConfig: {
                                OriginAccessIdentity: ''
                            }
                        }]
                    },
                    DefaultCacheBehavior: {
                        TargetOriginId: 'S3Origin',
                        ViewerProtocolPolicy: 'redirect-to-https',
                        TrustedSigners: {
                            Enabled: false,
                            Quantity: 0
                        },
                        ForwardedValues: {
                            QueryString: false,
                            Cookies: {
                                Forward: 'none'
                            }
                        },
                        MinTTL: 0,
                        DefaultTTL: 86400,
                        MaxTTL: 31536000
                    },
                    PriceClass: 'PriceClass_100'
                }
            };

            const result = await this.cloudfront.createDistribution(params).promise();
            
            this.config.cloudfrontDistribution = result.Distribution.Id;
            this.config.cdnUrl = `https://${result.Distribution.DomainName}`;
            
            console.log(`✅ CloudFront distribution created: ${this.config.cdnUrl}`);
            console.log('⏳ Note: Distribution deployment may take 10-15 minutes');
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to create CloudFront distribution:', error.message);
            console.log('💡 You can skip CloudFront and use S3 directly for testing');
            return false;
        }
    }

    async uploadVideos() {
        try {
            console.log('📤 Uploading videos to S3...');
            
            if (!fs.existsSync(VIDEO_DIR)) {
                console.error(`❌ Video directory not found: ${VIDEO_DIR}`);
                return false;
            }

            const files = fs.readdirSync(VIDEO_DIR).filter(file => 
                file.endsWith('.mp4') || file.endsWith('.mov') || file.endsWith('.webm')
            );

            if (files.length === 0) {
                console.log('⚠️  No video files found to upload');
                return true;
            }

            let uploadCount = 0;
            
            for (const filename of files) {
                const filePath = path.join(VIDEO_DIR, filename);
                const fileContent = fs.readFileSync(filePath);
                const contentType = mime.lookup(filePath) || 'video/mp4';

                const params = {
                    Bucket: this.config.bucketName,
                    Key: `videos/${filename}`,
                    Body: fileContent,
                    ContentType: contentType,
                    ACL: 'public-read',
                    CacheControl: 'max-age=31536000' // 1 year
                };

                try {
                    await this.s3.upload(params).promise();
                    console.log(`  ✅ Uploaded: ${filename}`);
                    uploadCount++;
                } catch (error) {
                    console.error(`  ❌ Failed to upload ${filename}:`, error.message);
                }
            }

            console.log(`📤 Uploaded ${uploadCount} of ${files.length} videos`);
            return uploadCount > 0;
            
        } catch (error) {
            console.error('❌ Upload process failed:', error.message);
            return false;
        }
    }

    async updateBackendConfig() {
        try {
            const backendEnvPath = path.join(PROJECT_ROOT, 'backend', '.env');
            const cdnBaseUrl = this.config.cdnUrl 
                ? `${this.config.cdnUrl}/videos/`
                : `https://${this.config.bucketName}.s3.amazonaws.com/videos/`;

            let envContent = '';
            
            if (fs.existsSync(backendEnvPath)) {
                envContent = fs.readFileSync(backendEnvPath, 'utf8');
            }

            // Update or add CDN_BASE_URL
            if (envContent.includes('CDN_BASE_URL=')) {
                envContent = envContent.replace(/CDN_BASE_URL=.*/, `CDN_BASE_URL=${cdnBaseUrl}`);
            } else {
                envContent += `\nCDN_BASE_URL=${cdnBaseUrl}\n`;
            }

            fs.writeFileSync(backendEnvPath, envContent);
            console.log('✅ Backend configuration updated');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to update backend config:', error.message);
            return false;
        }
    }

    async testVideoAccess() {
        try {
            console.log('🧪 Testing video access...');
            
            const testUrl = this.config.cdnUrl 
                ? `${this.config.cdnUrl}/videos/HELLO.mp4`
                : `https://${this.config.bucketName}.s3.amazonaws.com/videos/HELLO.mp4`;

            const https = require('https');
            
            return new Promise((resolve) => {
                https.get(testUrl, (res) => {
                    if (res.statusCode === 200) {
                        console.log('✅ Video access test successful');
                        console.log(`🔗 Test URL: ${testUrl}`);
                        resolve(true);
                    } else {
                        console.log(`⚠️  Video access test returned: ${res.statusCode}`);
                        resolve(false);
                    }
                }).on('error', (error) => {
                    console.log(`⚠️  Video access test failed: ${error.message}`);
                    resolve(false);
                });
            });
            
        } catch (error) {
            console.error('❌ Video access test failed:', error.message);
            return false;
        }
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'setup';

    const setup = new S3VideoSetup();

    console.log('☁️  AWS S3 Setup for Speech-to-Sign Videos\n');

    switch (command) {
        case 'setup':
            console.log('🚀 Starting full AWS setup...\n');
            
            if (!setup.initializeAWS()) {
                process.exit(1);
            }

            const bucketSuccess = await setup.createS3Bucket();
            if (!bucketSuccess) {
                process.exit(1);
            }

            await setup.createCloudFrontDistribution();
            await setup.uploadVideos();
            await setup.updateBackendConfig();
            setup.saveConfig();
            
            console.log('\n🎉 AWS setup complete!');
            console.log('\nNext steps:');
            console.log('1. Wait for CloudFront distribution to deploy (~15 minutes)');
            console.log('2. Test video access with: npm run test-videos');
            console.log('3. Start the development server: npm run dev');
            
            break;

        case 'upload':
            if (!setup.initializeAWS()) {
                process.exit(1);
            }
            await setup.uploadVideos();
            break;

        case 'test':
            await setup.testVideoAccess();
            break;

        case 'config':
            console.log('Current configuration:');
            console.log(JSON.stringify(setup.config, null, 2));
            break;

        default:
            console.log('Usage: npm run setup-s3 [command]');
            console.log('Commands:');
            console.log('  setup   - Full AWS setup (default)');
            console.log('  upload  - Upload videos only');
            console.log('  test    - Test video access');
            console.log('  config  - Show current config');
            break;
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    });
}

module.exports = S3VideoSetup;