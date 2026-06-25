const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const widget = fs.readFileSync(path.join(root, 'widget-v3.html'), 'utf8');
const buildId = fs.readFileSync(path.join(root, 'assets/js/build-id.js'), 'utf8');
const hotfix = fs.readFileSync(path.join(root, 'assets/js/bom-ska-service-hotfix-20260617d.js'), 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  widget.includes('assets/js/widget-runtime-bom20260617d.js?v=bom20260617d'),
  'widget-v3.html must boot through the official bom20260617d runtime'
);

assert(
  /window\.__BOM_BUILD_ID__\s*=\s*['"]bom20260617d['"]/.test(buildId),
  'build-id.js must pin bom20260617d'
);

assert(
  /window\.__BOM_BUILD_PINNED__\s*=\s*true/.test(buildId),
  'build-id.js must mark the build as pinned'
);

assert(
  /function loadLastGoodContext\(\)\s*{\s*if \(w\.__BOM_ALLOW_LAST_GOOD_CONTEXT__ !== true\) return null;/.test(hotfix),
  'last-good context must be disabled unless explicitly enabled'
);

assert(
  /function refreshBom\(\)[\s\S]*ignoreManual:\s*true[\s\S]*allowLastGoodFallback:\s*false[\s\S]*allowKnownRootFallback:\s*false/.test(hotfix),
  'refreshBom must resolve the current Product Explorer context without manual or stale fallback'
);

assert(
  !/return tryLoadFromLastGoodContext\(\{\}, err, 'refresh selected-branch falhou'\)/.test(hotfix),
  'selected-branch refresh must not silently fall back to last-good context'
);

console.log('PASS official widget flow contract');
