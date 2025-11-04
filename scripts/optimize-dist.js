#!/usr/bin/env node

/**
 * Post-build optimization script
 * Reduces built dist files size and improves performance
 */

import { readFileSync, writeFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';

const distDir = './dist';

// Remove source maps in production
if (process.env.NODE_ENV === 'production') {
  const files = ['index.js.map', 'stdio-server.js.map'];
  files.forEach(file => {
    const path = join(distDir, file);
    if (existsSync(path)) {
      rmSync(path);
      console.log(`✓ Removed ${file}`);
    }
  });
}

// Add shebang to entry points for better CLI usage
// index.js is built with --target bun, stdio-server.js with --target node
const entryPoints = [
  { file: 'index.js', runtime: 'bun' },
  { file: 'stdio-server.js', runtime: 'node' }
];
entryPoints.forEach(({ file, runtime }) => {
  const path = join(distDir, file);
  if (existsSync(path)) {
    let content = readFileSync(path, 'utf-8');
    const shebang = `#!/usr/bin/env ${runtime}\n`;
    if (!content.startsWith('#!/')) {
      content = shebang + content;
      writeFileSync(path, content);
      console.log(`✓ Added shebang to ${file} (runtime: ${runtime})`);
    } else {
      // Replace existing shebang if it's wrong
      const lines = content.split('\n');
      if (lines[0].startsWith('#!/') && lines[0] !== shebang.trim()) {
        lines[0] = shebang.trim();
        content = lines.join('\n');
        writeFileSync(path, content);
        console.log(`✓ Updated shebang in ${file} (runtime: ${runtime})`);
      }
    }
  }
});

console.log('✓ Build optimization complete');
