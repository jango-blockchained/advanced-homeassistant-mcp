const path = require('path');

module.exports = (request, options) => {
    // Handle chalk and related packages
    if (request === 'chalk' || request === '#ansi-styles' || request === '#supports-color') {
        return path.resolve(__dirname, 'node_modules', request.replace('#', ''));
    }

    // Call the default resolver
    return options.defaultResolver(request, {
        ...options,
        // Force node to resolve modules as CommonJS
        packageFilter: pkg => {
            if (pkg.type === 'module') {
                pkg.type = 'commonjs';
                if (pkg.exports && pkg.exports.import) {
                    pkg.main = pkg.exports.import;
                }
            }
            return pkg;
        },
    });
}; 