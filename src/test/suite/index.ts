import * as fs from 'fs';
import * as path from 'path';
import Mocha from 'mocha';

function findTestFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findTestFiles(filePath));
    } else if (file.endsWith('.test.js')) {
      results.push(filePath);
    }
  }
  return results;
}

export function run(): Promise<void> {
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 10000
  });

  return new Promise((resolve, reject) => {
    try {
      const files = findTestFiles(__dirname);
      files.forEach(f => mocha.addFile(f));

      mocha.run(failures => {
        if (failures > 0) {
          reject(new Error(`${failures} tests failed.`));
        } else {
          resolve();
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}
