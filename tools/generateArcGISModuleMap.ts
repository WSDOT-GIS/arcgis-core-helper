/**
 * This script generated the ArcGISModuleMap type
 * that was then copied to arcgis-extra.d.ts
 */

import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const baseDir = 'node_modules/@arcgis/core';
const outputFile = 'arcgis-module-map.d.ts';

// Helper function: Check if a file has a default export.
// This is a heuristic that looks for "export default" in the file content.
function hasDefaultExport(filePath: string) {
  try {
    const content = readFileSync(filePath, 'utf8');
    // A basic check: look for "export default"
    return content.includes('export default');
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return false;
  }
}

function getAllDtsModules(currentDir = '') {
  const fullPath = join(baseDir, currentDir);
  const entries = readdirSync(fullPath);
  let modules: { modulePath: string; fullEntryPath: string }[] = [];

  for (const entry of entries) {
    const entryPath = join(currentDir, entry);
    const fullEntryPath = join(baseDir, entryPath);
    const stat = statSync(fullEntryPath);

    if (stat.isDirectory()) {
      modules = modules.concat(getAllDtsModules(entryPath));
    } else if (entry.endsWith('.d.ts') && entry !== 'index.d.ts') {
      const modulePath = entryPath.replace(/\.d\.ts$/, '').replace(/\\/g, '/');
      modules.push({ modulePath, fullEntryPath });
    }
  }

  return modules;
}

const modules = getAllDtsModules();

const lines = [
  'export type ArcGISModuleMap = {',
  ...modules.map(({ modulePath, fullEntryPath }) => {
    if (hasDefaultExport(fullEntryPath)) {
      return `  "@arcgis/core/${modulePath}": (typeof import("@arcgis/core/${modulePath}"))["default"];`;
    }
    return `  "@arcgis/core/${modulePath}": typeof import("@arcgis/core/${modulePath}");`;
  }),
  '};',
];

writeFileSync(outputFile, lines.join('\n'), 'utf-8');

console.log(`✅ Generated ${outputFile} with ${modules.length} entries.`);
