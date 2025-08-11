#!/bin/bash

# Speech-to-Sign Deployment Script
# Supports multiple deployment targets: local, docker, heroku, aws

set -e

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_TARGET="${1:-local}"
ENVIRONMENT="${2:-production}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

# Pre-deployment checks
check_dependencies() {
    log "🔍 Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi
    
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
    fi
    
    # Check Node version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js version 18+ is required. Current version: $(node -v)"
    fi
    
    log "✅ Dependencies check passed"
}

# Build the application
build_application() {
    log "🏗️  Building application..."
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies
    log "📦 Installing dependencies..."
    npm run install:all
    
    # Build frontend and backend
    log "🔨 Building frontend and backend..."
    npm run build
    
    log "✅ Build completed"
}

# Run tests
run_tests() {
    log "🧪 Running tests..."
    
    cd "$PROJECT_ROOT"
    
    if [ -f "scripts/test-system.js" ]; then
        node scripts/test-system.js
    else
        warn "Test script not found, skipping tests"
    fi
    
    log "✅ Tests completed"
}

# Deploy locally
deploy_local() {
    log "🚀 Deploying locally..."
    
    # Check if .env file exists
    if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
        warn ".env file not found, copying from example"
        cp "$PROJECT_ROOT/backend/.env.example" "$PROJECT_ROOT/backend/.env"
        warn "Please configure your API keys in backend/.env"
    fi
    
    # Start the application
    log "🔥 Starting application..."
    cd "$PROJECT_ROOT"
    
    if command -v pm2 &> /dev/null; then
        # Use PM2 if available
        pm2 start ecosystem.config.js --env $ENVIRONMENT
        log "✅ Application started with PM2"
        log "📊 View logs: pm2 logs speech-to-sign"
        log "🔄 Restart: pm2 restart speech-to-sign"
        log "🛑 Stop: pm2 stop speech-to-sign"
    else
        # Start with npm
        log "Starting with npm (consider installing PM2 for production)"
        npm start &
        log "✅ Application started"
    fi
    
    log "🌐 Application available at:"
    log "   Frontend: http://localhost:3000"
    log "   Backend API: http://localhost:3001"
    log "   Health Check: http://localhost:3001/health"
}

# Deploy with Docker
deploy_docker() {
    log "🐳 Deploying with Docker..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
    fi
    
    cd "$PROJECT_ROOT"
    
    # Build and start containers
    log "🏗️  Building Docker images..."
    docker-compose build
    
    log "🚀 Starting containers..."
    docker-compose up -d
    
    # Wait for containers to be ready
    log "⏳ Waiting for containers to start..."
    sleep 10
    
    # Check container health
    if docker-compose ps | grep -q "Up"; then
        log "✅ Containers started successfully"
        log "🌐 Application available at:"
        log "   Frontend: http://localhost:3000"
        log "   Backend API: http://localhost:3001"
        
        log "📊 Container status:"
        docker-compose ps
        
        log "📋 Useful commands:"
        log "   View logs: npm run docker:logs"
        log "   Stop containers: npm run docker:down"
        log "   Restart: npm run docker:down && npm run docker:up"
    else
        error "Container startup failed"
    fi
}

# Deploy to Heroku
deploy_heroku() {
    log "🚀 Deploying to Heroku..."
    
    if ! command -v heroku &> /dev/null; then
        error "Heroku CLI is not installed. Install from: https://devcenter.heroku.com/articles/heroku-cli"
    fi
    
    cd "$PROJECT_ROOT"
    
    # Check if logged in to Heroku
    if ! heroku whoami &> /dev/null; then
        log "Please log in to Heroku:"
        heroku login
    fi
    
    # Create Heroku apps if they don't exist
    HEROKU_APP_NAME="${HEROKU_APP_NAME:-speech-to-sign-$(date +%s)}"
    
    log "📱 Creating/updating Heroku app: $HEROKU_APP_NAME"
    
    # Check if app exists
    if heroku apps:info "$HEROKU_APP_NAME" &> /dev/null; then
        log "App $HEROKU_APP_NAME already exists"
    else
        heroku create "$HEROKU_APP_NAME"
    fi
    
    # Set environment variables
    log "⚙️  Setting environment variables..."
    heroku config:set NODE_ENV=production -a "$HEROKU_APP_NAME"
    
    if [ -f "$PROJECT_ROOT/backend/.env" ]; then
        # Read .env file and set Heroku config vars
        while IFS='=' read -r key value; do
            if [[ ! -z "$key" && ! "$key" =~ ^# ]]; then
                heroku config:set "$key=$value" -a "$HEROKU_APP_NAME"
            fi
        done < "$PROJECT_ROOT/backend/.env"
    fi
    
    # Create Procfile for Heroku
    cat > "$PROJECT_ROOT/Procfile" << EOF
web: cd backend && npm start
EOF
    
    # Deploy
    log "🚀 Deploying to Heroku..."
    git add .
    git commit -m "Deploy to Heroku" || true
    git push heroku main
    
    # Open the app
    heroku open -a "$HEROKU_APP_NAME"
    
    log "✅ Deployed to Heroku: https://$HEROKU_APP_NAME.herokuapp.com"
}

# Deploy to AWS (simplified)
deploy_aws() {
    log "☁️  AWS deployment setup..."
    
    warn "AWS deployment requires additional setup:"
    warn "1. Configure AWS CLI: aws configure"
    warn "2. Set up ECS/Fargate or EC2 instances"
    warn "3. Configure load balancer and auto-scaling"
    warn "4. Set up RDS for database if needed"
    warn "5. Configure CloudFront for static assets"
    
    log "For now, using Docker deployment as preparation for AWS"
    deploy_docker
    
    log "📚 Refer to AWS documentation for full deployment:"
    log "   https://docs.aws.amazon.com/ecs/latest/developerguide/"
}

# Main deployment logic
main() {
    log "🎯 Starting deployment for target: $DEPLOY_TARGET"
    
    case "$DEPLOY_TARGET" in
        "local")
            check_dependencies
            build_application
            # Skip tests for local development
            deploy_local
            ;;
        "docker")
            check_dependencies
            deploy_docker
            ;;
        "heroku")
            check_dependencies
            build_application
            run_tests
            deploy_heroku
            ;;
        "aws")
            check_dependencies
            build_application
            run_tests
            deploy_aws
            ;;
        "test")
            check_dependencies
            build_application
            run_tests
            log "✅ Test deployment completed"
            ;;
        *)
            log "Usage: $0 [local|docker|heroku|aws|test] [environment]"
            log ""
            log "Deployment targets:"
            log "  local   - Deploy locally with npm/PM2"
            log "  docker  - Deploy with Docker Compose"
            log "  heroku  - Deploy to Heroku"
            log "  aws     - Deploy to AWS (setup guide)"
            log "  test    - Run tests only"
            log ""
            log "Environment: development|production (default: production)"
            exit 1
            ;;
    esac
    
    log "🎉 Deployment completed successfully!"
    
    if [ "$DEPLOY_TARGET" != "test" ]; then
        log ""
        log "📚 Next steps:"
        log "1. Configure your API keys (Google Cloud Speech, OpenAI)"
        log "2. Upload sign language videos"
        log "3. Test the application with real users"
        log "4. Set up monitoring and logging"
        log "5. Configure SSL/HTTPS for production"
    fi
}

# Run main function
main "$@"