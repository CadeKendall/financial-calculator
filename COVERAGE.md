# Function coverage and fidelity checklist

This checklist describes implemented behavior and its evidence. A checked item means the implementation exists and the listed tests exercise it; it does not mean exhaustive device equivalence. The suite currently contains 91 tests, with multiple assertions and key sequences in many tests. The browser expression trail has six integration tests in `expression.test.ts`, including storing the active operand in PV/N without evaluating the visible trail. Nine tests in `preview-controls.test.ts` cover TVM entry metadata, zero inputs, unknown/computed markers, full-precision pasted entries, and theme validation. Seven tests in `journal.test.ts` cover undoing TVM changes, pending arithmetic, errors, clears, resets, pastes, and history reopening; TVM and grouped cash-flow history; full-precision restoration; persistence validation; and bounded storage. Seven tests in `help.test.ts` cover every worksheet field/model variant, dynamic labels, modifier preservation, error recovery, search, related topics, and sheet geometry. Five tests in `gestures.test.ts` cover copy tap timing and cancellation, hold release, flip sequencing, overlapping requests, interruption recovery, and reduced motion.

The browser preview intentionally replaces the RCL button with Copy / Paste (hold) and ON/OFF with Define; the engine's original key map and RCL behavior are preserved. UI reminders and theme preferences are stored separately from the versioned engine session. Pointer holds, clipboard write confirmation, CF paste/ENTER, preset/custom colors, and preference reload were also exercised in the browser. Physical iPhone touch behavior is not yet verified.

## Feature matrix

| Complete in this implementation | Feature | Verification |
| --- | --- | --- |
| [x] | 44 physical keys and secondary mapping | Key inventory; arithmetic and worksheet sequences |
| [x] | CHAIN, AOS, parentheses, correction, sign, percent | Mode comparisons, nested expressions, percentages, backspace |
| [x] | Powers, roots, reciprocal, square, LN/EXP | Numeric operations; negative cube root; error handling |
| [x] | Trig, inverse trig, hyperbolic functions | Trig/modifier sequences, exact quadrants and singularities |
| [x] | Factorial, permutations, combinations | Keypad examples; input/work limits |
| [x] | Constants, ANS, random generator and seed | Repeated constants, answer reuse, deterministic seed |
| [x] | STO/RCL and memory arithmetic; ten-register worksheet | Display preservation, fresh entry, arithmetic, memory inspection |
| [x] | DEC, dates, separators, degrees/radians, CHAIN/AOS settings | Format changes, stored precision, ROUND, grouping, scientific notation |
| [x] | Clear, worksheet clear, TVM clear, reset, errors, power | Isolation, reset confirmation, recovery, off versus APD |
| [x] | All five TVM targets; P/Y and C/Y; BEGIN/END | Zero rates, unequal frequencies, payment timing, mortgage and savings |
| [x] | Amortization and range advancement | Per-payment rounding; three reference ranges; P1/P2 advancement |
| [x] | CF entry, groups, insert/delete, NPV, IRR | Reference results, sign reversal, repeated flows, repeated/multiple roots, no root |
| [x] | Bond price, yield, accrued interest; ACT/360; annual/semiannual | Reference price/AI; yield inversion; one coupon; 1980 boundary |
| [x] | SL, SYD, DB, DBX depreciation | Partial-year reference and analytical identities |
| [x] **provisional** | French SLF and DBF depreciation | Basic identities only; see limitations below |
| [x] | Data entry; LIN, Ln, EXP, PWR, 1-V; X/Y prediction | Known regressions, weighted moments, single-point/degenerate data |
| [x] | Percent change / compound growth, all targets | Reference growth and inverse identities |
| [x] | Interest conversion, both targets | Reference result and nominal/effective round trip |
| [x] | Date differences and date endpoints | Reference difference, leap year, actual/360 restrictions, invalid dates |
| [x] | Profit, all targets | Reference and inverse identities |
| [x] | Breakeven, all targets | Reference and inverse identities |
| [x] | Versioned session save/restore | Pending expression round trip, malformed/future/oversized/inconsistent input rejection |
| [x] | Snapshots, context IDs, completion events | Detached snapshots, worksheet contexts, events excluded from persistence |

## Reference cases

Page numbers below are the guide's printed page numbers. The main PDF has inconsistencies in some prose and tables; tests identify the particular numerical case used.

| Worksheet | Reference or independent check |
| --- | --- |
| TVM | Mortgage IY 5.50%; savings FV 5,524.48 (pp26–28) |
| Unequal frequencies | Monthly deposit with quarterly compounding, PMT -203.13 (pp37–38) |
| Amortization | Three ranges from the 120,000 loan example (pp38–39) |
| NPV / IRR | Edited cash-flow order: NPV 7,266.44; IRR 52.71% (pp47–49) |
| Bond | Table dates 2006-06-12 to 2007-12-31, PRI 98.56, AI 3.15 (pp56–57) |
| Depreciation | Partial first year and following year, SL (p62) |
| Percent change | 500 to 750 over five periods: 8.45% |
| Interest conversion | NOM 15%, C/Y 4: EFF 15.87% |
| Date | 2003-09-04 to 2003-11-01: 58 days |
| Profit | Selling price 125, margin 20%: cost 100 |
| Breakeven | Fixed 3,000, variable 15, price 20: quantity 600 |
| Memory | Store/recall, operations, clear and inspection sequences |
| Statistics | Analytically constructed samples for every model; no worked numerical regression example was found in the guide section |

Tests are divided into `finance.test.ts` (pure functions), `engine.test.ts` (physical sequences), and `boundaries.test.ts` (edge cases and regression checks). Assertions use exact decimal strings where appropriate, displayed precision for published rounded answers, and tolerances for inverse calculations. No live website is used as an oracle.

## Unresolved fidelity differences and deliberate limits

1. **French depreciation remains provisional.** SLF uses a 360-day first-year fraction. DBF uses life-dependent coefficients and a straight-line crossover. These implementations have basic tests but lack authoritative TI numerical fixtures for all date, life, coefficient, salvage, and crossover cases. Their exact TI behavior is not certified.
2. **Iterative calculations are bounded independently of TI firmware.** General rate searches scan `ln(1+i)` from -40 to 40 in steps of 0.25, then bisect brackets (at most 1,024 iterations per bracket). A root outside that interval, or a tangential TVM root without a sign-changing bracket, can produce Error 7. Failure to isolate a root is reported as unresolved, not proof that none exists.
3. **Multiple-sign-change IRR has an explicit work limit.** Root isolation handles expanded schedules through 128 periods with 100,000 polynomial evaluations. Larger mixed-sign schedules return Error 7. Single-sign-change schedules use grouped evaluation and do not have the 128-period restriction. Repeated roots are detected with a scaled numerical tolerance; extremely close roots can remain ambiguous. The selected root is closest to zero; an exact tie chooses the negative rate. TI tie behavior was not independently established.
4. **The RNG is independently chosen.** Park–Miller with a persisted seed is deterministic and repeatable, but its sequence is not claimed to match the hardware generator.
5. **Numerical fidelity is bounded by the documented precision policy.** Guard precision, underflow, extreme rates, near-singular data, non-default depreciation/amortization rounding, and error-code selection need a broader physical-device comparison. Undefined individual statistics return `null` in the pure API and a structured error when selected on the keypad.
6. **Display is a text model.** Scientific notation uses `e`; seven-segment glyphs, flashing indicators, key repeats, and physical timing belong to the future UI. Entered/computed markers reflect current interactions; the engine does not retain a separate historical marker for every worksheet field.
7. **Computations are synchronous.** There is no physical-key cancellation during a solver run, so hardware Error 8 interruption is not generated. The error type reserves it. A host that needs cancellation can isolate calculations in its own worker/task boundary.
8. **Defaults with ambiguous documentation:** percent-change PERIODS starts at 1, following the guide's calculation workflow. One guide table lists 0. A device comparison should settle that discrepancy.
9. **Verification does not yet include a physical BA II Plus or iPhone.** The code is platform-independent, but an Expo/Hermes integration run and a larger captured device corpus remain necessary before claiming broad compatibility. The included browser keypad is a local preview; it is not the final iPhone interface.

Full source is supplied so these differences can be resolved without replacing the public reducer or worksheet interfaces. Passing this suite establishes the covered cases, not universal equivalence.

Three tests in `dialog-motion.test.ts` cover interrupted History entrance/exit, reopening during dismissal, scroll restoration, reduced motion, Escape, and complete outside taps. Browser checks cover desktop, 390px and 320px layouts, modal focus return, theme changes, and the theme flip followed by Define. Native iPhone motion and touch behavior remain unverified.

Four tests in `display-precision.test.ts` cover the 2–6 cycle, non-mutation of stored values and calculation settings, raw entries/errors/dates/settings, separators, and validation. The browser verified 2 ÷ 34 through all five precisions, persistence after reload, and the right-hand tap target. The iPhone layout is a browser preview with an illustrative system area; actual hardware, native status-bar styling, and device-specific camera geometry remain to be verified during mobile conversion.
