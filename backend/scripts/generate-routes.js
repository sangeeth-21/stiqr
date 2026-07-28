#!/usr/bin/env node
// Generates Cloudflare Worker Hono routes from NestJS controllers
const fs = require('fs');
const path = require('path');

// Read all controller files and extract routes
const srcDir = path.join(__dirname, '..', 'src');
const controllers = {};

function extractRoutes(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const routes = [];
  const lines = content.split('\n');
  
  let currentPath = '';
  let currentMethod = '';
  let currentHandler = '';
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Detect route decorators: @Get(), @Post(), @Patch(), @Put(), @Delete()
    const routeMatch = line.match(/@(Get|Post|Patch|Put|Delete)\((['"`]([^'"]*)['"`])?\)/);
    if (routeMatch) {
      const method = routeMatch[1];
      const routePath = routeMatch[3] || '';
      
      // Look for the handler function name on next lines
      let handler = '';
      let summary = '';
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const handlerLine = lines[j].trim();
        const handlerMatch = handlerLine.match(/(?:async\s+)?(\w+)\s*\(/);
        if (handlerMatch && !handlerMatch[1].startsWith('@')) {
          handler = handlerMatch[1];
          break;
        }
        // Check for @ApiOperation summary
        const summaryMatch = handlerLine.match(/summary:\s*['"](.+?)['"]/);
        if (summaryMatch) summary = summaryMatch[1];
      }
      
      // Check for @ApiTags
      let tag = '';
      for (let j = Math.max(0, i - 5); j < i; j++) {
        const tagMatch = lines[j].match(/@ApiTags?\((?:\[['"](.+?)['"]\]|['"](.+?)['"])\)/);
        if (tagMatch) tag = tagMatch[1] || tagMatch[2];
      }
      
      if (handler) {
        routes.push({
          method: method.toUpperCase(),
          path: routePath,
          handler,
          summary,
          tag
        });
      }
    }
    i++;
  }
  
  return routes;
}

// Find all controller files
function findControllers(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findControllers(fullPath));
    } else if (entry.name.endsWith('.controller.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

const controllerFiles = findControllers(srcDir);
let totalRoutes = 0;
const allRoutes = {};

for (const file of controllerFiles) {
  const routes = extractRoutes(file);
  const moduleName = path.basename(file, '.controller.ts');
  if (routes.length > 0) {
    allRoutes[moduleName] = routes;
    totalRoutes += routes.length;
  }
}

// Output as JSON
const output = {
  totalRoutes,
  modules: Object.keys(allRoutes).length,
  routes: allRoutes
};

fs.writeFileSync(path.join(__dirname, 'routes-generated.json'), JSON.stringify(output, null, 2));
console.log(`Generated ${totalRoutes} routes from ${Object.keys(allRoutes).length} modules`);
console.log(JSON.stringify(Object.entries(allRoutes).map(([k, v]) => `${k}: ${v.length} routes`), null, 2));
