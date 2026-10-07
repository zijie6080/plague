#!/usr/bin/env node
import { buildState, writeState } from './lib/state.mjs';

const state = await buildState();
const files = await writeState(state);
console.log(`[state] wrote ${files.join(', ')}`);
