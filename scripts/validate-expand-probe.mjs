/**
 * Validação local do normalizador Expand Item (sem WAF/3DDashboard).
 * Uso: node scripts/validate-expand-probe.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const providerPath = join(__dirname, '../assets/js/integration/expand-item-provider.js');
const code = readFileSync(providerPath, 'utf8');
const global = {};
eval(code.replace(/typeof window !== 'undefined' \? window : global/g, 'global'));

const samplePayload = {
  member: [
    {
      owner: 'BusinessObject Owner',
      title: 'Physical Product00011810',
      type: 'VPMReference',
      revision: 'A',
      name: 'prd-81906998-00011810',
      id: 'DDED825666141C0063FDD61300021A89',
      state: 'IN_WORK'
    },
    {
      owner: 'BusinessObject Owner',
      title: 'Physical Product00011811',
      type: 'VPMReference',
      revision: 'A',
      name: 'prd-81906998-00011811',
      id: 'DDED825666141C0063FDD61E00173DAB',
      state: 'IN_WORK'
    },
    {
      name: 'Physical Product00011811.1',
      id: 'DDED825666141C0063FDD61F0004C6F9',
      type: 'VPMInstance'
    },
    {
      Path: [
        'DDED825666141C0063FDD61300021A89',
        'DDED825666141C0063FDD61F0004C6F9',
        'DDED825666141C0063FDD61E00173DAB'
      ]
    }
  ],
  totalItems: 4
};

const result = global.normalizeExpandItemPayload(samplePayload);
const checks = [
  ['pathCount > 0', result.stats.pathCount > 0],
  ['normalizedRows > 0', result.stats.normalizedRows > 0],
  ['rows.length === normalizedRows', result.rows.length === result.stats.normalizedRows],
  ['root level 0', result.rows[0] && result.rows[0].level === 0],
  ['child has instanceId', result.rows[1] && result.rows[1].instanceId],
  ['member.length !== rows.length (expected)', samplePayload.member.length !== result.rows.length],
  ['distinct rowKeys', new Set(result.rows.map((r) => r.rowKey)).size === result.rows.length]
];

let ok = true;
for (const [label, pass] of checks) {
  console.log(pass ? '✓' : '✗', label);
  if (!pass) ok = false;
}
console.log('\nSample normalized rows:', result.rows.length);
process.exit(ok ? 0 : 1);
