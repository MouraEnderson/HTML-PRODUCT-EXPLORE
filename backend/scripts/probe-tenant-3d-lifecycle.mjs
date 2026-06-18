#!/usr/bin/env node
/**
 * Tenant unblock probe — 3D representation + lifecycle maturity.
 * Usage:
 *   npm run probe:tenant -- ROOT_ID ITEM_ID
 *   npm run probe:tenant -- ROOT_ID ITEM_ID --change --target FROZEN
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { probeVisualization, resolveVisualization } from '../src/services/threeDxVisualizationService.js';
import {
  getLifecycleTransitions,
  changeMaturity,
  probeLifecycle
} from '../src/services/threeDxLifecycleService.js';
import { runUpstreamMatrix } from '../src/services/threeDxUpstreamMatrix.js';
import { getThreeDxConfig } from '../src/services/threeDxConfig.js';
import { sanitizeValue, stamp } from './probeSanitizer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'probe-output');

function parseArgs(argv) {
  const positional = [];
  const flags = { change: false, target: 'FROZEN' };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--change') {
      flags.change = true;
    } else if (arg === '--target' && argv[i + 1]) {
      flags.target = argv[++i];
    } else if (!arg.startsWith('--')) {
      positional.push(arg);
    }
  }
  return {
    rootId: positional[0] || '63FC553465A62400699E0792000086AB',
    itemId: positional[1] || '63FC553465A62400699DB56700005253',
    title: positional[2] || 'Tampo',
    name: positional[3] || 'prd-R1132100929518-01099369',
    ...flags
  };
}

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function writeJson(name, payload) {
  const file = path.join(OUTPUT_DIR, name);
  fs.writeFileSync(file, `${JSON.stringify(sanitizeValue(payload), null, 2)}\n`, 'utf8');
  return file;
}

function extractShapeIds(attempts = []) {
  const ids = new Set();
  attempts.forEach((a) => {
    const m = String(a.step || '').match(/3DShape[ /]([A-F0-9]{32}|[A-F0-9]{24,})/i);
    if (m) ids.add(m[1]);
    if (a.shapeCount > 0 && Array.isArray(a.shapeIds)) {
      a.shapeIds.forEach((id) => ids.add(id));
    }
  });
  return [...ids];
}

function build3dSummary(result) {
  const attempts = result.matrix?.attempts || result.probe?.attempts || [];
  const shapeIds = extractShapeIds(attempts);
  const fileCounts = attempts
    .filter((a) => a.fileCount != null)
    .map((a) => ({ step: a.step, fileCount: a.fileCount }));
  return {
    ok: !!result.resolve?.ok,
    code: result.resolve?.code || result.probe?.code || 'UNKNOWN',
    shapeIdsFound: shapeIds,
    derivedOutputFileCounts: fileCounts,
    hasWebModel: !!result.resolve?.ok && !!result.resolve?.modelUrl,
    format: result.resolve?.format || null
  };
}

function buildLifecycleSummary(result) {
  const transitions = result.transitions?.data?.transitions || [];
  const change = result.change || null;
  return {
    transitionsOk: !!result.transitions?.ok,
    transitionCount: transitions.length,
    currentState:
      result.transitions?.data?.currentState ||
      result.transitions?.data?.item?.currentState ||
      null,
    changeAttempted: !!result.change,
    changeOk: change?.ok || false,
    changeCode: change?.data?.code || null,
    stateAfter: change?.data?.stateAfter || change?.data?.newState || null
  };
}

function buildMarkdown({ args, config, viz, life, files }) {
  const lines = [
    '# BOM Tenant Probe Summary',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Context',
    '',
    `- Root ID: \`${args.rootId}\``,
    `- Item ID: \`${args.itemId}\``,
    `- Title: ${args.title}`,
    `- Mode: ${config.mode}`,
    `- Space URL configured: ${config.upstream?.spaceUrlConfigured}`,
    `- Credentials configured: ${config.upstream?.credentialsConfigured}`,
    '',
    '## 3D representation',
    '',
    `- PASS: ${viz.summary.hasWebModel ? 'yes' : '**no**'}`,
    `- Code: \`${viz.summary.code}\``,
    `- 3DShape IDs: ${viz.summary.shapeIdsFound.length ? viz.summary.shapeIdsFound.join(', ') : 'none'}`,
    '',
    '## Lifecycle / maturity',
    '',
    `- Transitions available: ${life.summary.transitionCount}`,
    `- Current state: ${life.summary.currentState || '—'}`,
    `- Change attempted: ${life.summary.changeAttempted ? 'yes' : 'no'}`,
    `- Change OK: ${life.summary.changeOk ? 'yes' : 'no'}`,
    '',
    '## Output files',
    '',
    ...Object.entries(files).map(([k, v]) => `- ${k}: \`${path.basename(v)}\``),
    '',
    '## Next steps',
    '',
    'See `docs/tenant-unblock/admin-dassault-checklist.md`.',
    ''
  ];
  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv);
  const config = getThreeDxConfig();
  const ts = stamp();

  console.log('=== BOM Tenant Unblock Probe ===');
  console.log('rootId:', args.rootId);
  console.log('itemId:', args.itemId);
  console.log('change:', args.change ? `yes → ${args.target}` : 'no');

  if (!config.isConfigured && config.mode !== 'mock') {
    console.error('Upstream not configured. Set THREEDX_SPACE_URL, SECURITY_CONTEXT, ENOVIA_COOKIE.');
    process.exit(2);
  }

  const matrix = await runUpstreamMatrix({
    referenceId: args.itemId,
    title: args.title,
    name: args.name
  });

  const probe = await probeVisualization({
    referenceId: args.itemId,
    title: args.title,
    mode: 'dseng-official'
  });

  const resolve = await resolveVisualization(
    { referenceId: args.itemId, title: args.title, mode: 'dseng-official' },
    { headers: { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'bom-resolver.onrender.com' }, protocol: 'https', get: () => 'bom-resolver.onrender.com' }
  );

  const vizPayload = {
    generatedAt: new Date().toISOString(),
    args: { rootId: args.rootId, itemId: args.itemId, title: args.title, name: args.name },
    matrix,
    probe,
    resolve: resolve.data || resolve
  };
  vizPayload.summary = build3dSummary({ matrix, probe, resolve: resolve.data });

  const transitions = await getLifecycleTransitions({
    referenceId: args.itemId,
    mode: 'dseng-official'
  });

  let changeResult = null;
  if (args.change) {
    const current =
      transitions.data?.currentState ||
      transitions.data?.item?.currentState ||
      'IN_WORK';
    changeResult = await changeMaturity({
      referenceId: args.itemId,
      currentState: current,
      targetState: args.target,
      transition: 'promote',
      action: 'promote',
      confirm: true,
      mode: 'dseng-official'
    });
  } else {
    console.log('Skipping change-maturity (use --change --target FROZEN to test).');
  }

  const lifeProbe = await probeLifecycle({ referenceId: args.itemId });

  const lifePayload = {
    generatedAt: new Date().toISOString(),
    args: { itemId: args.itemId, change: args.change, target: args.target },
    transitions: transitions.data || transitions,
    transitionsMeta: { ok: transitions.ok, status: transitions.status },
    change: changeResult ? changeResult.data || changeResult : null,
    probe: lifeProbe
  };
  lifePayload.summary = buildLifecycleSummary({
    transitions,
    change: changeResult
  });

  ensureOutputDir();
  const files = {
    json3d: writeJson(`3d-probe-${ts}.json`, vizPayload),
    jsonLife: writeJson(`lifecycle-probe-${ts}.json`, lifePayload)
  };
  const mdPath = path.join(OUTPUT_DIR, `probe-summary-${ts}.md`);
  files.md = mdPath;
  fs.writeFileSync(mdPath, buildMarkdown({ args, config, viz: vizPayload, life: lifePayload, files }), 'utf8');

  console.log('\n--- 3D summary ---');
  console.log(JSON.stringify(vizPayload.summary, null, 2));
  console.log('\n--- Lifecycle summary ---');
  console.log(JSON.stringify(lifePayload.summary, null, 2));
  console.log('\n--- Output files ---');
  Object.entries(files).forEach(([k, v]) => console.log(k + ':', v));

  const exitCode = vizPayload.summary.hasWebModel && lifePayload.summary.transitionsOk ? 0 : 1;
  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
