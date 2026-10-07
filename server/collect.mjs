#!/usr/bin/env node
// One-shot collection run. Used by cron / GitHub Actions and for manual runs.
//   node server/collect.mjs              # run sources that are due
//   node server/collect.mjs --force      # run everything now
//   node server/collect.mjs --only rpn-telegram,asna
import { runCollectors } from './lib/pipeline.mjs';
import { buildState, writeState } from './lib/state.mjs';

const args = process.argv.slice(2);
const force = args.includes('--force');
const onlyArg = args.find((a) => a.startsWith('--only'));
const only = onlyArg ? (onlyArg.includes('=') ? onlyArg.split('=')[1] : args[args.indexOf(onlyArg) + 1])?.split(',') : undefined;

const started = Date.now();
console.log(`[collect] ${new Date().toISOString()} force=${force}${only ? ` only=${only}` : ''}`);
const result = await runCollectors({ force, only });
if (result?.skipped) {
  console.log('[collect] another run holds the lock; skipping');
} else {
  const state = await buildState();
  const files = await writeState(state);
  console.log(`[collect] ran ${result.ran.length} sources in ${((Date.now() - started) / 1000).toFixed(1)}s → ${files.length} state file(s); ${state.news.length} news clusters, ${state.anomalies.active.length} active signals`);
}
