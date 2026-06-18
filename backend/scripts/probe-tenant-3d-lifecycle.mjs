#!/usr/bin/env node
import 'dotenv/config';
import { probeVisualization } from '../src/services/threeDxVisualizationService.js';
import { probeLifecycle } from '../src/services/threeDxLifecycleService.js';

const referenceId = process.argv[2] || '63FC553465A62400699E0792000086AB';
const childId = process.argv[3] || '63FC553465A62400699DB567';

async function main() {
  console.log('=== BOM Tenant Probe ===');
  console.log('referenceId:', referenceId);
  console.log('childId:', childId);

  const vizRoot = await probeVisualization({ referenceId, title: 'root' });
  console.log('\n--- visualization root ---');
  console.log(JSON.stringify(vizRoot, null, 2));

  const vizChild = await probeVisualization({ referenceId: childId, title: 'child' });
  console.log('\n--- visualization child ---');
  console.log(JSON.stringify(vizChild, null, 2));

  const lifeChild = await probeLifecycle({ referenceId: childId });
  console.log('\n--- lifecycle child ---');
  console.log(JSON.stringify(lifeChild, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
