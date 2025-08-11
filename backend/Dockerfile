FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S backend -u 1001

# Create temp directory for audio processing
RUN mkdir -p /tmp && chown backend:nodejs /tmp

USER backend

EXPOSE 3001

CMD ["node", "src/server.js"]