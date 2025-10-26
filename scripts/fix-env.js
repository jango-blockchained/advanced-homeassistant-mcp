// This script fixes the NODE_ENV environment variable before any imports
console.log('Setting NODE_ENV to "development" before imports');
process.env.NODE_ENV = "development";

// Add more debugging
console.log(`NODE_ENV is now set to: "${process.env.NODE_ENV}"`);

// Import the main application
import './dist/index.js';
