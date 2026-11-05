# Handoff: Independent BA II Plus iPhone Calculator

Updated: 2026-11-05

## What the user wants

Maintain and refine the completed independent financial calculator. The user confirms that the app is installed on their iPhone and working. Treat that as the current product status. This handoff intentionally omits installation troubleshooting at the user's request.

The user asked to place this document in the finished product folder so a new conversation can continue from the actual project.

## Where things stand

The app is working on the user's iPhone, confirmed by the user on 2026-11-05. No new feature or bug fix is currently requested. Earlier notes describing phone installation or physical-device use as unverified are historical and superseded by this confirmation; it does not establish exhaustive testing of every worksheet or device behavior.

Project root:
C:\Users\Temp\Documents\Codex\2026-10-18\files-mentioned-by-the-user-codex\outputs\ba-ii-plus-engine

Architecture:
- Independent offline TypeScript engine in src/, using decimal.js.
- Calculator interface in web/, shared between the browser preview and mobile app.
- Expo / React Native app in mobile/, embedding the bundled interface in a WebView.
- Native bridges provide device storage, clipboard, safe areas, and haptics.
- Remotion preview project in motion-studio/; the phone animation runs through the web implementation, without a Remotion runtime dependency.

Implemented product features:
- CHAIN/AOS arithmetic, primary/secondary functions, memory, formatting, structured errors, versioned sessions, and the standard financial worksheets.
- TVM, payment/compounding frequencies, BEGIN/END, amortization, cash flows, NPV/IRR, bonds, depreciation, data/statistics, percent change, interest conversion, dates, profit, and breakeven.
- Large LCD with a slim surrounding plastic rim, expression trail, active operand, and TVM reminders. Known zero values count as inputs; four entered TVM values identify the remaining unknown.
- Undo and persistent calculation history, including reopening saved calculations.
- Copy / hold-to-paste, full stored precision, a copied-value reminder, and triple-tap clearing of that reminder.
- Answer-area tap cycles display precision through 2, 3, 4, 5, and 6 decimals, without rewriting the stored number.
- Define key opens contextual offline help, examples, next steps, related worksheet fields, search, and error recovery. The tinted bottom sheet uses progressive blur and eased motion.
- Theme center on the calculator back, preset/custom colors, corner hold/tilt, and front/back flip.
- iPhone safe-area layout, a straight plastic band across the top, larger worksheet identifiers, fixed page zoom behavior, and native haptic feedback.
- Continuous single-finger X restart gesture, tolerant of quick and imperfect strokes and starting from any corner. Restart clears calculator values and worksheets while preserving history and theme preferences; Undo can recover the prior work.
- Cinematic component/faceplate replacement restart animation, approximately 1.8 seconds. Visible internals include a green circuit board, coin battery, black epoxy chip, and LCD connector, informed by the user's physical calculator reference. Reduced-motion behavior is supported.

## Next step

Read this handoff and the relevant source files, then continue with the user's next refinement request. No installation work is pending in this handoff. Avoid inventing new features or restarting completed work.

If changes are requested, edit the shared web interface or engine as appropriate, regenerate the mobile bundle, and run the relevant checks. Ask for device feedback only where the change needs physical iPhone verification.

## Decisions that must survive

- Use an independent engine based on TI's standard BA II Plus specification and mathematical formulas. Do not inspect or copy baiiplus.com.
- Preserve the established physical-calculator aesthetic and the user's specific layout, interaction, and animation choices.
- The visible ON/OFF position is Define; the visible RCL position is Copy / Paste (hold). Original engine APIs remain available.
- Calculator restart preserves history. Keep full numerical values separate from display formatting.
- Keep the restart animation under two seconds and visibly show calculator components.
- Voice control was considered and dropped; the user chose refinement instead.
- Do not describe selected passing examples as universal equivalence with TI hardware.

## What the next agent needs to know

- Current mobile dependencies read from mobile/package.json: Expo ~57.0.30, React Native 0.86.3, React 19.2.3, react-native-webview 13.16.1.
- Read mobile/AGENTS.md before mobile code changes. It requires checking documentation for the installed Expo major before changing Expo, React Native, or EAS APIs, and requires lint/type checks for code work.
- Do not manually create generated native ios/ or android/ directories.
- Use npx expo install for Expo-compatible dependency changes.
- Browser local storage and native app storage are separate; do not assume their sessions or histories are interchangeable.
- Generated mobile content must be rebuilt after shared web/engine changes; editing only the generated bundle is not a lasting fix.
- README.md, COVERAGE.md, and BACKLOG.md contain historical statements and test counts. Consult them for detail, but verify current behavior and counts rather than copying stale status claims.
- Previously reported fidelity limitations include provisional French depreciation behavior and difficult iterative numerical cases. Consult COVERAGE.md before promising exact equivalence.
- No tests were rerun for this documentation-only handoff. Earlier work included automated engine, interface, gesture, help, history, and motion checks; do not present those historical results as a fresh run.

## Files and existing work

All paths below are relative to the project root above.

- src/index.ts: public engine exports.
- src/engine.ts, src/state.ts, src/worksheet-control.ts: state and key/worksheet behavior.
- src/session.ts: validated engine session persistence.
- tests/: numerical, keystroke, boundary, interface, gesture, and related verification.
- web/index.html, web/app.js, web/style.css: main calculator interface.
- web/phone-shell.css, web/phone-shell.js: phone geometry and viewport behavior.
- web/help-content.js, web/help-sheet.js, web/help.css, web/dialog-motion.js: contextual definitions and sheet motion.
- web/journal.js: Undo and calculation history.
- web/preferences.js, web/display-precision.js: preferences and display precision.
- web/hold.js, web/flip.js, web/tap-sequence.js: hold, flip, and tap interactions.
- web/restart-gesture.js: continuous X detection.
- web/reset-animation.js, web/reset-animation.css, web/reset-internals.js, web/reset-motion.js: restart animation and component artwork/motion.
- mobile/App.tsx and mobile/bridge/: native host and bridges.
- mobile/scripts/bundle-calculator.mjs: packages the shared calculator for the offline phone app.
- mobile/generated/: generated bundled interface.
- motion-studio/: Remotion animation preview and related resources.
- README.md, COVERAGE.md, BACKLOG.md, mobile/README.md: existing project documentation.
- START-CALCULATOR.cmd: local browser preview launcher.
- START-IPHONE.cmd: development preview launcher.

## Verification commands

From the project root:

    npm run verify
    npm run demo
    npm start

The browser preview is served at http://127.0.0.1:8787/; the illustrative phone layout is available with ?view=iphone.

From mobile/ after shared interface changes:

    npm run verify

This runs bundle generation, TypeScript checking, and Expo lint. Development preview can be started with npm start from mobile/ when needed. The installed phone app does not need a development server for ordinary use.
