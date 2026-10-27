import fs from 'fs';
import path from 'path';

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync('dist/assets')) {
  copyDir('dist/assets', 'assets');
}
if (fs.existsSync('dist')) {
  copyDir('dist', 'docs');
}
if (fs.existsSync('public/.nojekyll')) {
  fs.copyFileSync('public/.nojekyll', '.nojekyll');
}
