import Module from 'module';
import * as path from 'path';
import * as fs from 'fs';
import Mocha from 'mocha';
import { mockVscode } from './mockVscode';

// Intercept require('vscode') for unit tests outside VS Code Extension Host
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const originalRequire = (Module as any).prototype.require;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Module as any).prototype.require = function (id: string) {
  if (id === 'vscode') {
    return mockVscode;
  }
  // eslint-disable-next-line prefer-rest-params
  return originalRequire.apply(this, arguments);
};

const mocha = new Mocha({
  ui: 'tdd',
  color: true
});

function addTests(dir: string): void {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      addTests(fullPath);
    } else if (file.endsWith('.test.js')) {
      mocha.addFile(fullPath);
    }
  }
}

addTests(path.join(__dirname, 'suite'));

mocha.run(failures => {
  process.exitCode = failures ? 1 : 0;
});
