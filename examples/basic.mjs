import { createInitialState, pressKeys, getSnapshot, calculateNPV, calculateIRR, serializeState, restoreState } from '../dist/index.js';

function checked(result) {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}

const keys = [
  'SECOND', 'IY', '1', '2', 'ENTER', 'SECOND', 'CPT',
  '3', '6', '0', 'N',
  '7', '5', '0', '0', '0', 'PV',
  '4', '2', '5', 'DOT', '8', '4', 'SIGN', 'PMT', 'CPT', 'IY'
];
const state = pressKeys(createInitialState(), keys);
if (state.error) throw new Error(JSON.stringify(state.error));
console.log(`Mortgage annual interest: ${getSnapshot(state).display}%`);

const flows = [{ amount: '3000', frequency: 1 }, { amount: '4000', frequency: 1 }, { amount: '5000', frequency: 4 }];
console.log(`Cash-flow NPV: ${Number(checked(calculateNPV('-7000', flows, '20'))).toFixed(2)}`);
console.log(`Cash-flow IRR: ${Number(checked(calculateIRR('-7000', flows)).rate).toFixed(2)}%`);

const restored = checked(restoreState(checked(serializeState(state))));
console.log(`Restored mortgage display: ${getSnapshot(restored).display}%`);
