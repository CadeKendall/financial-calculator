# Calculator preview backlog

## Expo / iPhone tactile feedback

- [x] Add a light, crisp haptic click for each accepted calculator button tap, including touch controls on the screen. Keep feedback optional in settings.
- [x] Give hold actions a short progression of gentle pulses, ending with a distinct confirmation when the hold activates. Stop immediately on release, cancellation, scrolling, or leaving the app; never run a continuous long buzz or add a tap pulse after a completed hold.
- [ ] Tune the implemented Expo Haptics intensity and timing on a physical iPhone, including device settings and background cancellation. Browser preview stays silent; consider an optional quiet click sound separately if desired.

- [x] Replace the browser ON/OFF position with contextual Define help: individual worksheet fields, examples, next steps, errors, search, and a sliding sheet with progressive blur. Engine power behavior remains available through its API.
- [x] Show all five TVM registers after the first assignment, count explicit zero inputs, mark the fifth unknown with ?, and distinguish computed results.
- [x] Replace the browser RCL button with Copy / Paste (hold), preserving the full stored value and showing a copied-value reminder.
- [x] Add a back-of-calculator theme center with recommended finishes, custom colors, and saved preferences.
- [x] Animate the front/back flip, with a subtle corner press and tilt while holding, a 480ms turn, and a plain reverse turn. Reduced-motion preferences skip these effects.
- [x] Add a browsable history of the last 50 completed calculations, including full stored values, inputs, settings, and reopening the saved calculator session.
- [x] Add Undo for the last 100 calculator actions in the current page session, including clears, pastes, and reopening history; screen tap areas align with ENTER and IRR.

## Implemented from browser feedback

- [x] Extend the LCD toward the top and both sides, retaining a slim plastic rim and rounded corners.
- [x] Show preceding expression entries in muted text while keeping the active number separate. For `6 + 4`, PV and N still receive `4`.
- [x] Remove the redundant CALCULATOR footer label while retaining worksheet names and arithmetic/angle settings.
- [x] Move BGN to the upper-right, retain the theme hold area without its arrow, and put TVM values inline when they fit or underneath when needed.
- [x] Lighten the Define sheet relative to the selected screen color and ease its rise over 720ms and dismissal over 540ms, retaining progressive blur and related worksheet definitions.
- [x] Polish key depth/press feedback, theme color transitions and selection marks, and History presentation with a fixed heading, lighter surface, gentle motion, and outside-tap dismissal.
- [x] Cycle answer display precision from 2 to 6 and back through the right-hand answer area, independently of stored values and FORMAT rounding.
- [x] Add an iPhone shell preview with a slim rim, LCD status-area corners, central plastic camera surround, and safe-area spacing. Native-device verification remains part of mobile conversion.

- [x] Join the island surround to the LCD rim with curved shoulders and a continuous responsive contour; contain flip overflow and reserve scrollbar space so the case does not shift sideways.
