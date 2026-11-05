# BA II Plus reset motion studio

This Remotion composition previews the calculator's actual **1.8-second** faceplate replacement at 60 fps. It shares the motion score and internal component illustration with the live app. It does not bundle Remotion or a video into Expo Go.

## Run

From this directory:

```powershell
npm install
npm run dev
```

Open the exact local URL printed by Studio and select **BAIIPlusReset**. Play or scrub the timeline. `npm run lint` runs ESLint and TypeScript; `npm run typecheck` runs TypeScript alone. No video export is required.

## What is shared

- `../web/reset-motion.js` owns all timing, numeric poses, cubic-bezier easing, and the deterministic sampler. The live app turns these tracks into compositor keyframes. Remotion samples the same tracks at `frame / fps`.
- `../web/reset-internals.js` supplies the same original SVG in both previews: green PCB, coin cell and clip, epoxy chip, ribbon connector, LCD backing, screws, and molded chassis ribs.
- `src/faceplate-fixture.json` is a resolved-style capture of the actual 375 x 813 app interface, including the measured screen and key geometry. The live app captures the current theme and values on every reset; this design preview uses a fixed Classic capture with a zero readout.

The panel is one rigid assembly. Its buttons and labels never scatter independently. The case and internals remain stationary. The outgoing panel leaves by 540 ms, the components are fully exposed until 1040 ms, and the new panel seats at 1500 ms. The live engine commits its reset at 1540 ms, releases interaction at 1700 ms, and finishes at 1800 ms. The short LCD refresh conceals the state handoff.

`src/Composition.tsx` contains frame-driven layers only. There are no time-based CSS animations, timers, network assets, or random values in the composition. The source of truth for motion edits is the shared `reset-motion.js` file, so the app and Studio cannot drift into different choreographies.

## Fidelity and references

The front is captured from the working app rather than redrawn. The internals are an original vector interpretation of the user's opened-calculator photo and [iFixit's standard BA II Plus battery replacement, step 4](https://www.ifixit.com/Guide/Texas+Instruments+BA+II+Plus+Battery+Replacement/140160). Component placement is adapted to the app's phone proportions; it is not a circuit diagram or a literal mechanical model.

The preview follows Remotion's [frame-driven animation](https://www.remotion.dev/docs/use-current-frame), [interpolation](https://www.remotion.dev/docs/interpolate), and [easing](https://www.remotion.dev/docs/easing) guidance. Reduced motion and interruption cleanup are handled by the live reset controller and its tests, outside the deterministic Studio composition.
