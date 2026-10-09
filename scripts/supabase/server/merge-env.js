// Replaces or appends KEY=VALUE lines of <settings> in <env file> (other keys untouched).
// usage: node merge-env.js <env file> <settings file>
const fs = require('fs');
const [file, settingsFile] = process.argv.slice(2);
let text = fs.readFileSync(file, 'utf8');
for (const line of fs.readFileSync(settingsFile, 'utf8').split('\n')) {
  const index = line.indexOf('=');
  if (index <= 0) continue;
  const key = line.slice(0, index);
  const value = line.slice(index + 1);
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  text = pattern.test(text) ? text.replace(pattern, () => `${key}=${value}`) : text.replace(/\n*$/, '\n') + `${key}=${value}\n`;
}
fs.writeFileSync(file, text);
