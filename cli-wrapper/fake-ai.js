/**
 * Fake AI spinner for local SpinShare CLI testing.
 * Run: node dist/index.js node fake-ai.js
 */
const SPINNER = ["|", "/", "-", "\\"];
const INTERVAL_MS = 120;
const DURATION_MS = 5000;

let i = 0;
const start = Date.now();

const timer = setInterval(() => {
  process.stdout.write(`\r${SPINNER[i % SPINNER.length]}`);
  i += 1;
  if (Date.now() - start >= DURATION_MS) {
    clearInterval(timer);
    process.stdout.write("\r \n");
    process.exit(0);
  }
}, INTERVAL_MS);
