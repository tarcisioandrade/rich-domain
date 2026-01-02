const fs = require('fs');
const path = require('path');

// Add package.json to ESM dist to mark as module
const esmPackageJson = {
  "type": "module"
};

fs.writeFileSync(
  path.join(__dirname, 'dist/esm/package.json'),
  JSON.stringify(esmPackageJson, null, 2)
);

console.log('✓ Added package.json to dist/esm');
