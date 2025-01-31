const path = require('path');

module.exports = (request, options) => {
    // Handle chalk and related packages
    if (request === 'chalk' || request === '#ansi-styles' || request === '#supports-color') {
        return path.resolve(__dirname, 'node_modules', request.replace('#', ''));
    }

    // Handle .js extensions for TypeScript files
    if (request.endsWith('.js')) {
        const tsRequest = request.replace(/\.js$/, '.ts');
        try {
            return options.defaultResolver(tsRequest, options);
        } catch (e) {
            // If the .ts file doesn't exist, continue with the original request
        }
    }

    // Call the default resolver
    return options.defaultResolver(request, {
        ...options,
        // Handle ESM modules
        packageFilter: pkg => {
            // Preserve ESM modules
            if (pkg.type === 'module' && pkg.exports) {
                // If there's a specific export for the current conditions, use that
                if (pkg.exports.import) {
                    pkg.main = pkg.exports.import;
                } else if (typeof pkg.exports === 'string') {
                    pkg.main = pkg.exports;
                }
            }
            return pkg;
        },
    });
}; 