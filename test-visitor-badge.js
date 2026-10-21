const https = require('https');

const url = new URL(
  'https://api.visitorbadge.io/api/VisitorHit?user=Atik203&repo=Atik203&label=Profile%20Views&countColor=%237B1E7A'
);

console.log('Checking the visitor badge endpoint...');
console.log(`URL: ${url}`);

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
      console.error('Visitor badge check failed:');
      failures.forEach((message) => console.error(`- ${message}`));
      process.exitCode = 1;
      return;
    }

    console.log('Visitor badge check passed: HTTP 200 SVG with the expected label.');
  });
});

request.on('timeout', () => request.destroy(new Error('request timed out')));
request.on('error', (error) => {
  console.error(`Visitor badge request failed: ${error.message}`);
  process.exitCode = 1;
});
