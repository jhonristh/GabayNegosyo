const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const sw = fs.readFileSync('public/sw.js', 'utf8');
test('PWA navigation is always network-only with public offline fallback', () => {
  const block = sw.match(/if \(request\.mode === "navigate"\) \{([\s\S]*?)\n  \}/);
  assert.ok(block, 'navigation branch exists');
  assert.match(block[1], /fetch\(request\)/);
  assert.match(block[1], /caches\.match\("\/offline"\)/);
  assert.doesNotMatch(block[1], /putInRuntimeCache|caches\.match\(request\)/);
});
