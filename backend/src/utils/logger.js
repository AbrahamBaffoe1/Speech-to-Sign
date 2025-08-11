const logger = {
  info: (message, data = {}) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, 
      Object.keys(data).length > 0 ? JSON.stringify(data) : '');
  },
  
  error: (message, error = {}) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, 
      error.stack || error);
  },
  
  warn: (message, data = {}) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, 
      Object.keys(data).length > 0 ? JSON.stringify(data) : '');
  },
  
  debug: (message, data = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, 
        Object.keys(data).length > 0 ? JSON.stringify(data) : '');
    }
  }
};

module.exports = { logger };