import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIndex, parseLines } from '../skills/capabilities/scripts/fetch-index.mjs';

test('parseLines + buildIndex: sorted, one header per repo with blob base url', () => {
  const stdout = [
    JSON.stringify({ name: 'zeta', url: 'https://github.com/o/zeta', branch: 'main', text: '# Zeta\n' }),
    '',
    JSON.stringify({ name: 'alpha', url: 'https://github.com/o/alpha', branch: 'develop', text: '\n# Alpha\n\n' }),
  ].join('\n');
  const index = buildIndex(parseLines(stdout));
  assert.equal(
    index,
    '<!-- ==== repo: alpha | https://github.com/o/alpha/blob/develop ==== -->\n\n# Alpha\n\n' +
      '<!-- ==== repo: zeta | https://github.com/o/zeta/blob/main ==== -->\n\n# Zeta\n',
  );
});

test('buildIndex: no repos gives empty index', () => {
  assert.equal(buildIndex([]), '');
});
