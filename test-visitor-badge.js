const https = require('https');

const url = new URL(
  'https://api.visitorbadge.io/api/VisitorHit?user=Atik203&repo=Atik203&label=Profile%20Views&countColor=%237B1E7A'
);
const runCount = process.argv[2] === undefined ? 1 : Number(process.argv[2]);
const concurrency = process.argv[3] === undefined ? 1 : Number(process.argv[3]);
const maxConcurrency = 5;

if (
  !Number.isSafeInteger(runCount) ||
  runCount < 1 ||
  !Number.isSafeInteger(concurrency) ||
  concurrency < 1 ||
  concurrency > maxConcurrency
) {
  console.error(`Usage: node test-visitor-badge.js [positive-number-of-runs] [concurrency 1-${maxConcurrency}]`);
  process.exit(1);
}

function checkBadge() {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { timeout: 15000 }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });

      response.on('end', () => {
        const contentType = response.headers['content-type'] || '';
        const checks = [
          [response.statusCode === 200, `expected HTTP 200, got ${response.statusCode}`],
          [contentType.includes('image/svg+xml'), `expected an SVG response, got ${contentType || 'no content type'}`],
          [/<svg\b/i.test(body), 'response body does not contain an SVG badge'],
          [/Profile Views/i.test(body), 'badge does not contain the Profile Views label'],
        ];
        const failures = checks.filter(([passed]) => !passed).map(([, message]) => message);

        if (failures.length > 0) {
          reject(new Error(failures.join('; ')));
          return;
        }

        resolve();
      });
    });

    request.on('timeout', () => request.destroy(new Error('request timed out')));
    request.on('error', reject);
  });
}

async function main() {
  console.log(`Checking the visitor badge ${runCount} time${runCount === 1 ? '' : 's'} with concurrency ${concurrency}...`);
  console.log(`URL: ${url}`);

  let nextRun = 1;
  let failure;

  async function runChecks() {
    while (nextRun <= runCount && !failure) {
      const runNumber = nextRun;
      nextRun += 1;

      try {
        await checkBadge();
        console.log(`Run ${runNumber}/${runCount} passed.`);
      } catch (error) {
        failure = { runNumber, error };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, runCount) }, runChecks));

  if (failure) {
    console.error(`Run ${failure.runNumber}/${runCount} failed: ${failure.error.message}`);
    process.exitCode = 1;
    return;
  }

  console.log('All visitor badge checks passed.');
}

main();
