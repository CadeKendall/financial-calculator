# Financial Calculator

I was tired of using a slow, old, and unintuitive calculator, so I made my own, it has newer buttons, like a copy and paste, undo, history, and a DEFINE button that explains what each button does, and many more things. Basically, I just wanted a version that I wish was real, every little thing i added was a result of an issue I had with the physical calculator, yes this is vibe coded, took me about 13 hours, if you have trouble sideloading it onto your phone, just put the github link into an ai chat and it will explain everything. Oh, if you hold the top right corner, it flips the calculator around and lets you change all of the colors. Now back to the boring stuff, I hope you enjoy it/that it works at all: 

An independent, open-source financial calculator that follows the keystroke model of the BA II Plus. It is an offline TypeScript calculation engine with a browser interface and an iPhone app. Version 0.1.0 includes numerical functions, all 44 physical key identifiers, worksheet navigation, calculator state, display formatting, completion events, and validated session storage. A local browser keypad and an Expo Go iPhone app are included. The mobile app preserves the existing UI in a bundled WebView and adds native storage, clipboard, safe areas, and haptics.

## Use it on your iPhone

Double-click **START-IPHONE.cmd**, sign in with the same Expo account as Expo Go on your iPhone when prompted, keep both devices on the same Wi-Fi, and scan the terminal QR code with your iPhone Camera. See [mobile instructions](mobile/README.md) for setup, verification, and connection help.

## Use the calculator now

On this Windows computer, double-click **START-CALCULATOR.cmd** in this folder. It starts the calculator and opens it in your default browser. Keep its terminal window open while using it.

You can also run `npm start` from this folder, then open **http://127.0.0.1:8787**. The server accepts connections only from this computer. To stop it, press Ctrl+C in its terminal. If starting from the ZIP, extract the entire ZIP first; Node.js must be installed. The launcher installs dependencies if needed.

Click the keys, or use your keyboard for numbers and arithmetic. F2 selects 2ND, Escape is CE/C, and Backspace corrects a digit. The page includes worksheet instructions and a mortgage example. Session values are saved in this browser's local storage; a different browser has its own session.

The browser preview is in `web/`, with a small Node server in `scripts/serve.mjs`. The engine itself still has no server or browser dependency.

The expanded screen shows earlier expression entries in muted text above the active value. For `6 + 4`, the trail shows `6 +` and the active value remains `4`; pressing PV or N stores `4`. After equals, the trail includes the completed expression. This is display context, not an expression editor, and CHAIN/AOS still determine evaluation. The trail is saved with this browser session.

**TVM reminder:** enter a value using any TVM key to reveal the five registers in order. Unentered values are blank. Once four inputs are entered, the remaining register displays `?`; a computed result is marked `*`. Enter `0` explicitly when it is a known input. Changing an input marks a previous computed answer as unknown again. This reminder does not choose or compute the target for you: use CPT and the desired TVM key as usual. Older sessions can recover nonzero TVM entries; explicit zero-entry history was not recorded before this feature and must be entered again.

**Copy and paste:** the gold Copy / Paste (hold) button occupies the browser's former RCL position. Tap to copy the full stored numeric value to the system clipboard and the calculator's saved copy buffer. Hold for about half a second to paste that saved value into the active entry. In a prompted worksheet such as CF, press ENTER to commit it. Holding pastes the last value copied in this calculator, not unrelated external clipboard text. The copied value remains visible above the TVM row. With the button focused, Shift+Enter also pastes. If the browser blocks system clipboard access, the saved copy buffer still works and the status message explains the fallback. Display rounding does not change the copied value. The underlying engine still exposes RCL, and the Memory worksheet remains available through 2ND → 0.

**Themes:** hold the upper-right corner to turn the calculator over. Choose Classic, Midnight, Porcelain, or Graphite, or set six individual colors. Text colors adjust for contrast. Press Calculator to return to the front; keyboard users can focus the corner and press Enter, or press Escape to return. Themes save in this browser. The back retains the case outline and includes screws and a battery-cover detail. Holding the corner subtly tilts the case before a smooth 480ms flip. Returning uses the reverse flip without the press effect. Reduced-motion preferences skip both effects.

The implementation was written independently from mathematical formulas and the standard calculator specification. It does not use or contact baiiplus.com. Its only runtime dependency is `decimal.js`; there are no accounts, network calls, native modules, or filesystem dependencies in `src/`.

**Undo and History:** tap the left screen area (ending above the center of ENTER) for Undo, or the middle area (ending above the right edge of IRR) for History. Ctrl+Z / Command+Z also undo. Undo retains 100 calculator actions while the page is open, including register changes, errors, clears, pastes, and reopening history. It resets on reload. History saves the last 50 completed calculations locally, with full stored results, inputs, and settings. Reopen restores the entire saved calculator session; Undo returns to the previous work. History remains through reloads and calculator resets. It starts recording from this update and does not backfill earlier results. Theme and clipboard preferences are separate from Undo and history restoration.

**Define:** the former ON/OFF key opens contextual help for the current field or unfamiliar function. For example, 2ND → PV → Define explains AMORT P1. The offline catalog has 110 topics covering every worksheet field, advanced functions, and general guidance; errors add recovery steps. Each topic includes a definition, an example, and what to press next. Related fields and search work without changing inputs, pending modifiers, Undo, or history. Basic numbers, arithmetic, and TVM keys use the general help entry rather than individual definitions. The sheet uses a slightly lighter tint of the selected screen color, with text contrast recalculated for that tint. It rises from the viewport bottom to just below the LCD over 720ms with a soft start and finish (540ms to dismiss), progressively applying up to 3px of background blur. Close, Escape, an outside tap, or a downward handle drag dismiss it. Reduced-motion preferences skip the slide. On extremely short viewports the sheet reserves at least 120px so its close control and scrolling content remain reachable. The preview is now always on, including restored older sessions; engine power APIs are unchanged.

**Status:** implementation with automated reference and boundary tests, not a claim of universal TI hardware equivalence. Read [COVERAGE.md](./COVERAGE.md) before relying on exact keystroke or numerical fidelity, especially French depreciation and difficult iterative calculations.

## Run verification

Install a current Node.js LTS release if Node is not already installed. Open a terminal in this folder and run:

```sh
npm ci
npm run verify
npm run demo
```

`npm ci` downloads the locked development dependencies. Once installed, calculations and verification work locally. `verify` checks source types, runs all tests, and builds JavaScript plus TypeScript declarations into `dist/`. A successful test run reports every test as passed and exits with code zero.

The demo should print:

```text
Mortgage annual interest: 5.50%
Cash-flow NPV: 7266.44
Cash-flow IRR: 52.71%
Restored mortgage display: 5.50%
```

For individual commands, use `npm test`, `npm run typecheck`, or `npm run build`. `npm run test:watch` reruns tests as source files change.

## Connect the future app

After building, the folder can be installed as a local package in an Expo project:

```sh
npm install ../ba-ii-plus-engine
```

Adjust that path to the actual folder location. Import the public entry point:

```ts
import {
  createInitialState, pressKey, getSnapshot,
  serializeState, restoreState, type Key
} from 'ba-ii-plus-engine';

let state = createInitialState();

function onKey(key: Key) {
  state = pressKey(state, key);
  const snapshot = getSnapshot(state);
  // Render snapshot.display, snapshot.label, and snapshot.indicators.
  // Optional history: consume state.events once after this key press.
  return snapshot;
}

onKey('1');
onKey('ADD');
onKey('2');
onKey('EQUALS'); // display: "3.00"

const saved = serializeState(state);
if (saved.ok) {
  // The app chooses where to persist saved.value.
  const restored = restoreState(saved.value);
  if (restored.ok) state = restored.value;
}
```

The package builds and runs under Node. An actual Expo/iPhone runtime has not been exercised in this deliverable. The eventual app owns rendering, touch feedback, its inactivity timer, persistence, and optional history storage.

## Public API

| Interface | Contract |
| --- | --- |
| `createInitialState()` | New independent state with standard settings and zeroed registers. |
| `pressKey(state, key)` | Pure reducer returning a new state. Failures appear in `state.error`; the failed operation rolls back. |
| `pressKeys(state, keys)` | Convenience sequence reducer. Inspect the final error before using results. |
| `pasteValue(state, decimalText)` | Enters a validated decimal without the ten-keypress-digit limit. Preserves up to 13 significant digits; ENTER still commits worksheet fields. Invalid or read-only destinations return a state with a structured error. |
| `getSnapshot(state)` | Detached display data, indicators, context identifier, stored values, settings, and current events. |
| `autoPowerDown(state)` | Preserves pending work while sleeping. The host app calls this after its own inactivity timer. |
| `serializeState(state)` | `Result<string>` with a versioned JSON envelope. Completion events are excluded. |
| `restoreState(json)` | `Result<CalculatorState>` after schema, numeric, enum, size, and structural checks. Unknown versions fail. |
| `KEYS`, `KEY_ROWS`, `SECONDARY` | Stable physical identifiers, physical row order, and secondary action mapping. |

Press `SECOND` followed by the **physical** key: for example, `SECOND`, `PV` opens amortization; `SECOND`, `4` opens depreciation. Do not pass secondary action names as physical keys. `SECOND`, `CPT` exits a worksheet. All key identifiers are defined in [src/keys.ts](./src/keys.ts).

State numeric registers use decimal strings without separators. Never reconstruct state values from formatted display text. `getSnapshot` returns context identifiers such as `TVM.IY`, `BOND.PRI`, and `STAT.meanX` for future help panels. It returns both `value` and `display`, and the selected variable name in `label`.

Completion events have `type`, `context`, `result`, `inputs`, and `settings`. They are transient: consume them once after each reducer call, rather than whenever a UI rerenders. Automatic worksheet results also emit events. Restoring a session never replays old events. There are no generated timestamps or identifiers; the host can supply those when saving history.

## Pure calculation functions

These accept decimal strings or finite numbers and return `{ ok: true, value }` or `{ ok: false, error: { code, kind, message } }`. Prefer strings when inputs already contain many digits. Exported calculation functions catch numerical failures and return structured errors.

| Function | Outputs / units |
| --- | --- |
| `calculateTVM(target, values)` | N, IY, PV, PMT, or FV. IY is nominal annual percent; N counts payments. |
| `calculateAmortization(values, first, last, decimals?)` | BAL, PRN, INT over an inclusive payment range. |
| `calculateNPV(initial, groups, interestPercent)` | Present value; interest is percent **per cash-flow period**. |
| `calculateIRR(initial, groups)` | `{ rate, roots }` in percent per period; selected rate is closest to zero. |
| `calculateBond(target, values)` | PRI, YLD, AI; prices and coupon amounts per 100 face value. |
| `calculateDepreciation(values, decimals?)` | DEP, RBV, RDV; method and year are explicit. |
| `calculateStatistics(points, model?)` | Moments and regression coefficients. Undefined individual statistics are `null`. |
| `predictStatistics(target, value, points, model)` | X or Y prediction. Undefined regressions return an error. |
| `calculatePercentChange(target, values)` | OLD, NEW, CHANGE, PERIODS; CHANGE is percent. |
| `calculateInterestConversion(target, values)` | NOM or EFF, both percent. |
| `calculateDate(target, values)` | ISO date for DT1/DT2 or decimal day count for DBD. |
| `calculateProfit(target, values)` | CST, SEL, or MAR; margin is percent of selling price. |
| `calculateBreakeven(target, values)` | FC, VC, P, PFT, or Q. |
| `formatNumber(value, settings)` | Display string with US/EUR separators and the chosen DEC setting. |

Pure date inputs use `YYYY-MM-DD`; keypad date input uses the active calculator date convention. Cash-flow groups are `{ amount, frequency }`; the initial flow is separate. In one-variable statistics, each point's `y` is its frequency. In other models, `y` is the observed value.

## Structure and precision

`numeric.ts` owns decimal arithmetic, register limits, rounding, and bounded root finding. `tvm.ts`, `cashflow.ts`, `bonds.ts`, `depreciation.ts`, `dates.ts`, `statistics.ts`, and `worksheets.ts` contain independent formulas. `state.ts`, `engine.ts`, and `worksheet-control.ts` handle keys and state. `session.ts` handles persisted data. `index.ts` is the supported export surface.

Decimal operations use a private 40-digit constructor. Register writes round to 13 significant digits. Formatting uses at most ten significant digits; changing DEC does not rewrite registers. Explicit ROUND does. Amortization and depreciation apply worksheet rounding. Floating DEC=9 uses ten significant digits. This implements an explicit numerical policy without claiming to duplicate TI's internal algorithms bit for bit.

## References

The specification sources are [TI's standard BA II Plus guidebook](https://education.ti.com/html/eguides/financials/pdfs/EN/BA-II-PLUS_EN.pdf), its [depreciation worksheet reference](https://education.ti.com/html/eguides/financials/baiiplus/en/Content/M_DepreciationWS/DPW_DepreciationVariables.HTML), the supplied physical calculator image, and [decimal.js documentation](https://mikemcl.github.io/decimal.js/). The future app integration target is [Expo TypeScript](https://docs.expo.dev/guides/typescript/).

This is an independent implementation, not a Texas Instruments product or endorsement. It is not affiliated with Texas Instruments. BA II Plus is a trademark of Texas Instruments, used here only to describe compatibility.

## License

[MIT](./LICENSE). Dependencies keep their own licenses, including the Expo template notice in `mobile/LICENSE` and Remotion's license for the `motion-studio/` preview tooling.

History opens with a short rise and fade and closes with a shorter reverse motion. Its header stays visible while the entries scroll; Close, Escape, or tapping outside dismisses it. Reduced-motion preferences skip the animation. Theme colors transition gently and the selected preset has a checkmark.


**Answer precision:** tap the right-hand part of the answer to cycle 2 → 3 → 4 → 5 → 6 → 2 decimal places. This presentation preference saves in this browser and leaves the stored number, Copy, pending arithmetic, and financial worksheet rounding unchanged. Raw number entry, dates, errors, and setting screens keep their own formatting. FORMAT still controls engine rounding and explicit ROUND; changing DEC or resetting FORMAT/calculator clears the display override. Large numbers retain the engine's display digit limits.

**iPhone layout preview:** open http://127.0.0.1:8787/?view=iphone. This uses the same saved calculator session with a phone-width shell and an illustrative 59px top system area and 34px bottom inset. The clock, camera shape, and status icons are decorative preview elements, not live system UI. The narrow central plastic bridge hugs the illustrative island, with a continuous LCD rim around the upper corners. Holding the upper-right corner, including the preview status area, opens the theme center. The preview also uses tighter key spacing with 48px-high tap targets. It remains scrollable when content or the viewport needs more room.

For a phone-sized standalone web surface, the shell uses `viewport-fit=cover` and device-provided `safe-area-inset-*` values rather than the illustrative insets. Backgrounds extend behind the system area; calculator values and key controls stay below it. The theme corner target extends into the status area in the browser preview; native system-owned status-bar touches cannot be assumed to reach the app. See [WebKit's safe-area guidance](https://webkit.org/blog/7929/designing-websites-for-iphone-x/). Native conversion must supply real safe-area/status-bar behavior and verify camera-surround width (`--camera-bridge-width` is adjustable), system-icon contrast, orientation, and font scaling on actual devices. This preview is not a packaged iPhone app.
