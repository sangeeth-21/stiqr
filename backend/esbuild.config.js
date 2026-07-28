const esbuild = require('esbuild');

const production = process.env.NODE_ENV === 'production';

esbuild.build({
  entryPoints: ['src/worker.ts'],
  bundle: true,
  outfile: 'dist/worker.js',
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  sourcemap: true,
  minify: production,
  define: {
    'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
    global: 'globalThis',
  },
  conditions: ['worker', 'browser'],
  logLevel: 'info',
  metafile: true,
}).then(result => {
  console.log('Build complete');
  for (const [file, info] of Object.entries(result.metafile.outputs)) {
    console.log(`${file}: ${(info.bytes / 1024).toFixed(1)}KB`);
  }
}).catch(err => {
  console.error('Build failed:', err.message);
  process.exit(1);
});
