import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const psScript = path.join(__dirname, 'package.ps1');

try {
  execSync(`powershell -ExecutionPolicy Bypass -File "${psScript}"`, {
    stdio: 'inherit',
  });
} catch (err) {
  process.exit(1);
}
