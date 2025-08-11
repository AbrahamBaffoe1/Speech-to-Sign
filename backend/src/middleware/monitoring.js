const { logger } = require('../utils/logger');

// System metrics tracking
const metrics = {
    requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byEndpoint: {}
    },
    processing: {
        transcriptions: 0,
        mappings: 0,
        avgLatency: 0,
        latencyHistory: []
    },
    errors: {
        total: 0,
        byType: {}
    },
    system: {
        startTime: Date.now(),
        uptime: 0,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
    }
};

// Request tracking middleware
const requestTracker = (req, res, next) => {
    const startTime = Date.now();
    
    // Track request
    metrics.requests.total++;
    const endpoint = req.route?.path || req.path;
    if (!metrics.requests.byEndpoint[endpoint]) {
        metrics.requests.byEndpoint[endpoint] = { count: 0, avgLatency: 0 };
    }
    metrics.requests.byEndpoint[endpoint].count++;
    
    // Override res.end to track completion
    const originalEnd = res.end;
    res.end = function(...args) {
        const latency = Date.now() - startTime;
        
        // Update metrics
        if (res.statusCode < 400) {
            metrics.requests.successful++;
        } else {
            metrics.requests.failed++;
        }
        
        // Update endpoint latency
        const endpointMetrics = metrics.requests.byEndpoint[endpoint];
        endpointMetrics.avgLatency = (endpointMetrics.avgLatency + latency) / 2;
        
        // Log slow requests
        if (latency > 5000) {
            logger.warn('Slow request detected', {
                endpoint,
                method: req.method,
                latency,
                statusCode: res.statusCode
            });
        }
        
        originalEnd.apply(this, args);
    };
    
    next();
};

// Processing time tracker
const trackProcessingTime = (type, duration) => {
    if (type === 'transcription') {
        metrics.processing.transcriptions++;
    } else if (type === 'mapping') {
        metrics.processing.mappings++;
    }
    
    // Update average latency
    metrics.processing.latencyHistory.push(duration);
    if (metrics.processing.latencyHistory.length > 100) {
        metrics.processing.latencyHistory.shift();
    }
    
    metrics.processing.avgLatency = 
        metrics.processing.latencyHistory.reduce((sum, lat) => sum + lat, 0) / 
        metrics.processing.latencyHistory.length;
};

// Error tracking
const trackError = (error, type = 'general') => {
    metrics.errors.total++;
    if (!metrics.errors.byType[type]) {
        metrics.errors.byType[type] = 0;
    }
    metrics.errors.byType[type]++;
    
    logger.error('Tracked error', { 
        type, 
        message: error.message, 
        stack: error.stack 
    });
};

// System health check
const getSystemHealth = () => {
    const now = Date.now();
    const uptime = now - metrics.system.startTime;
    
    // Update system metrics
    metrics.system.uptime = uptime;
    metrics.system.memory = process.memoryUsage();
    metrics.system.cpu = process.cpuUsage();
    
    // Calculate health score
    const successRate = metrics.requests.total > 0 
        ? (metrics.requests.successful / metrics.requests.total) * 100 
        : 100;
    
    const avgLatency = metrics.processing.avgLatency || 0;
    const memoryUsage = (metrics.system.memory.heapUsed / metrics.system.memory.heapTotal) * 100;
    
    // Health status
    let status = 'healthy';
    let issues = [];
    
    if (successRate < 95) {
        status = 'degraded';
        issues.push(`Low success rate: ${successRate.toFixed(1)}%`);
    }
    
    if (avgLatency > 3000) {
        status = 'degraded';
        issues.push(`High latency: ${avgLatency.toFixed(0)}ms`);
    }
    
    if (memoryUsage > 85) {
        status = 'degraded';
        issues.push(`High memory usage: ${memoryUsage.toFixed(1)}%`);
    }
    
    if (metrics.errors.total > metrics.requests.successful * 0.05) {
        status = 'unhealthy';
        issues.push('High error rate');
    }
    
    return {
        status,
        uptime: Math.floor(uptime / 1000), // seconds
        issues,
        metrics: {
            requests: {
                total: metrics.requests.total,
                successful: metrics.requests.successful,
                failed: metrics.requests.failed,
                successRate: successRate.toFixed(1) + '%'
            },
            processing: {
                totalTranscriptions: metrics.processing.transcriptions,
                totalMappings: metrics.processing.mappings,
                avgLatency: avgLatency.toFixed(0) + 'ms'
            },
            system: {
                memoryUsage: memoryUsage.toFixed(1) + '%',
                heapUsed: Math.round(metrics.system.memory.heapUsed / 1024 / 1024) + 'MB',
                heapTotal: Math.round(metrics.system.memory.heapTotal / 1024 / 1024) + 'MB'
            },
            errors: {
                total: metrics.errors.total,
                byType: metrics.errors.byType
            }
        },
        timestamp: new Date().toISOString()
    };
};

// Performance monitoring middleware
const performanceMonitor = (req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        // Track different operation types
        if (req.path.includes('/transcribe')) {
            trackProcessingTime('transcription', duration);
        } else if (req.path.includes('/map')) {
            trackProcessingTime('mapping', duration);
        }
        
        // Log performance data
        logger.debug('Request performance', {
            method: req.method,
            path: req.path,
            duration,
            statusCode: res.statusCode
        });
    });
    
    next();
};

// Reset metrics (for testing)
const resetMetrics = () => {
    metrics.requests = {
        total: 0,
        successful: 0,
        failed: 0,
        byEndpoint: {}
    };
    metrics.processing = {
        transcriptions: 0,
        mappings: 0,
        avgLatency: 0,
        latencyHistory: []
    };
    metrics.errors = {
        total: 0,
        byType: {}
    };
    metrics.system.startTime = Date.now();
};

module.exports = {
    requestTracker,
    trackProcessingTime,
    trackError,
    getSystemHealth,
    performanceMonitor,
    resetMetrics,
    metrics // For testing
};