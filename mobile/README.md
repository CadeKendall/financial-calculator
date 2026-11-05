# Financial Calculator in Expo Go

This is an Expo SDK 57 app for the iPhone. It packages the existing calculator UI and TypeScript engine into a local WebView, with native safe-area values, status-bar styling, persistent storage, clipboard copying, and haptics. It does not load the calculator from localhost or a website. This preserves the current interface; it is not a rewrite of the controls into React Native views.

## Open it on your phone

1. Install/update **Expo Go** from the App Store. Keep the iPhone and computer on the same Wi-Fi.
2. Sign in to Expo Go on the iPhone. Double-click `START-IPHONE.cmd` in the parent folder. It checks computer sign-in; if prompted, open the printed login link in your computer browser and sign in with **the same Expo account**. Keep that terminal open.
3. Scan its QR code using the iPhone Camera, then tap **Open in Expo Go**. Allow Expo Go's Local Network permission if asked.
4. After the first bundle loads, use the calculator normally. Hold the top-right corner for themes and the **Tactile feedback** toggle.

If using a terminal, run `npm ci` then `npm start` in this folder. `npm start` rebuilds the bundled calculator before serving it. When changing parent `web/` or `src/` files during development, run `npm run bundle` again; Metro will pick up the generated module.

Expo Go development loading requires the computer/server. Calculations, definitions, and history use bundled local code once loaded. This is not yet a separately installed App Store/TestFlight app. A future signed build will remove the development-server requirement.

The phone starts with its own saved session; browser history and themes are not transferred automatically. Reloading normally preserves phone values/history/themes. Clearing Expo Go app data or uninstalling it can remove them.

## Standalone installation with AltStore Classic

The `altstore` EAS build profile compiles an unsigned **Release** build for a real iPhone, with the JavaScript and calculator HTML embedded. AltStore Classic then signs this IPA using your Apple account. After installation, the calculator does not need Expo Go, the development server, or an internet connection to calculate. Its saved session is separate from the copy inside Expo Go.

This is renewable sideloading, not a permanent signing exemption: free Apple accounts require refresh within seven days. AltStore can attempt refresh in the background and provides a Shortcuts action. A daily attempt gives more margin than a once-weekly automation. The normal AltServer route needs the phone on the same Wi-Fi as the running computer, or connected by USB, during refresh. AltStore also documents an optional Remote AltServer setup with its own requirements. Neither route guarantees that an unattended refresh will succeed; check the expiry shown in My Apps.

Build preparation is in `eas.json`, `.eas/build/altstore.yml`, and `scripts/build-altstore.sh`. The cloud job uses Xcode on macOS and intentionally skips Apple signing credentials. It checks that the archive is for iPhoneOS and includes `main.jsbundle`, then produces `FinancialCalculator.ipa` for AltStore to sign. A Simulator build cannot be substituted.

The first standalone build (version 1.0.0, build 1) completed on October 26, 2026: [Expo build details](https://expo.dev/accounts/cdkapps/projects/independent-financial-calculator/builds/2c731210-698f-4d11-b44e-0bcb2dfb6abf). It requires iOS 16.4 or later. The downloaded IPA passed ZIP integrity checks and contains the exact current offline calculator HTML inside its embedded Hermes bundle. Its checksum and build metadata are saved beside the IPA in `../../altstore-build.json`. AltStore signing, installation, and renewal still require verification on the physical iPhone.

To rebuild from Windows, first run `npm run verify` here so `generated/calculator.ts` contains the current engine and UI. Then run these PowerShell commands in this mobile folder:

```powershell
$env:EAS_NO_VCS = '1'
$env:EAS_PROJECT_ROOT = (Get-Location).Path
npx --yes eas-cli@latest build --platform ios --profile altstore
```

This uploads source to the Expo account linked in `app.json` and uses that account's available build allowance. Check any quota or payment prompt before continuing. `.easignore` excludes credentials, environment files, local caches, development dependencies, and native build artifacts; `generated/calculator.ts` is included, so the cloud build does not need the parent engine project. The source snapshot mode avoids creating a Git commit solely for a personal build.

Install using [AltStore's official Windows guide](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows):

1. Install AltServer and its required Apple software from the links in that guide.
2. Connect the unlocked iPhone by USB, trust the computer, and use AltServer's **Install AltStore** command. Enter your Apple credentials directly into the official application, not a chat or project file.
3. Follow the guide's device trust and Developer Mode steps.
4. Save the finished `FinancialCalculator.ipa` to Files on the iPhone. In AltStore Classic, use **My Apps → +** and select the IPA.
5. Open the installed calculator, then verify it still opens after disconnecting from the computer. Set up and test refresh before relying on automation.

References: [AltStore refresh and Shortcuts](https://faq.altstore.io/altstore-classic/your-altstore), [AltServer connection requirements](https://faq.altstore.io/altstore-classic/altserver), [optional Remote AltServers](https://faq.altstore.io/altstore-classic/remote-altservers), [Expo custom builds](https://docs.expo.dev/custom-builds/get-started/).

## Verification

- Parent folder: `npm run verify` checks the calculator and native storage adapter.
- This folder: `npm run verify` bundles the UI, typechecks React Native, and lints.
- `npx expo-doctor` checks Expo compatibility.
- `npm run export` builds an iOS JavaScript bundle without needing a Mac.

Before treating this as a release, check on a physical iPhone: real camera/status area, key reach and scrolling at your text size, Define open/close/drag, theme flip, tap and hold haptics, Copy into another app, and saved values after closing/reopening Expo Go. Windows/browser checks do not verify iOS rendering or physical haptic intensity.

Haptics use a light tap, gentle hold pulses at 180/380ms, and a short confirmation at the 550ms hold threshold. Release, cancellation, scrolling, and backgrounding cancel pending pulses. Device settings and Low Power Mode can suppress haptics. No click sound is added.

## Connection help

- iPhone Expo Go requires the computer and phone to be signed in to the same Expo account. Run `npx expo login --browser` in this folder to sign in, then tap **Try Again** on the phone. If changing an already signed-in account, restart the server. See [Expo's sign-in troubleshooting](https://docs.expo.dev/troubleshooting/expo-go-sign-in-required/).
- Use the current terminal QR code; the computer's Wi-Fi address can change.
- If the project is incompatible, compare the SDK version Expo Go reports with SDK 57. Expo currently recommends SDK 57 for physical-device Expo Go during the SDK 58 transition.
- If the connection times out, confirm both devices are on the same non-guest Wi-Fi and Expo Go has Local Network permission. A Windows Firewall prompt may need Node.js allowed on the private network. Do not enable public-network access unnecessarily.
- If local Wi-Fi routing is unavailable, ask to set up Expo's tunnel mode separately.

## iPhone layout notes

### Continuous X restart

On the calculator front, draw a diagonal, connect to the adjacent corner without lifting your finger, then draw the other diagonal across the first. Start at any corner, in either direction; uneven diagonals and rounded turns are accepted. Use a mark at least about 48 points wide and tall and finish within four seconds. There is no minimum drawing time; the recognizer needs at least four sampled positions to see the crossing. Release to restart. This works over the LCD, keys, or plastic; it is inactive while Define, History, or the theme center is open so their scrolling and editing stay separate.

Restart restores all calculator registers, worksheets, pending arithmetic, and calculation settings to defaults, and clears the local copied value and display trail. Completed history, theme, and haptics preferences are preserved. Undo restores the previous calculation.

The X runs a 1.8-second faceplate replacement: 180ms at rest, 360ms lifting/removing the original face, 500ms with the components fully exposed, 460ms installing the replacement, then a 200ms LCD refresh. The actual full reset occurs at 1540ms with the existing confirmation haptic. Input returns at 1700ms; a final quiet interval prevents another restart until 1800ms. Snapshot preparation is included in the initial hold. Reduced motion resets immediately. Interrupted animations finish the reset once, remove their layers, and unlock the calculator.

The exposed assembly is an original SVG illustration: a green circuit board, coin-cell battery and metal holder, black epoxy chip, traces and small components, striped LCD connector, LCD backing, and case screws. It uses the supplied photo and [iFixit's standard BA II Plus battery guide](https://documents.cdn.ifixit.com/pdf/ifixit/guide_140160_en.pdf) as visual references. Its proportions fit this app; it is not a circuit schematic or a claim of exact mechanical reconstruction.

`../web/reset-motion.js` owns the shared timeline (`RESET_TIMING`), easing (`RESET_EASING`), and numerical motion tracks. `../web/reset-animation.js` captures the actual current interface with resolved styles and runs those tracks through the browser's native animation compositor. `../web/reset-internals.js` supplies the SVG; `../web/reset-animation.css` supplies depth and layering. `../web/app.js` connects the effect to the existing full restart. Ordinary CE/C and worksheet clear behavior is unchanged.

The separate `../motion-studio` Remotion project provides a frame-driven preview using the same numerical tracks and SVG, plus a captured, resolved-style snapshot of the actual UI. To inspect or tune it, run `npm ci` and `npm run dev` in that folder, then open the Studio URL printed in the terminal. The phone has no Remotion runtime dependency, video download, or remote animation asset; its live faceplate uses the phone's current theme, values, and layout. After changing animation files, run `npm run bundle` in this mobile folder and reload the project in Expo Go to test the update.

Offline packaging uses literal replacement callbacks and verifies the exact embedded script contents and their syntax after HTML assembly. This prevents minified JavaScript containing dollar substitution patterns from being changed by HTML insertion.

Run `node scripts/smoke-animation.mjs` and open `/web/mobile-smoke.html` for isolated native-layout QA, or add `--desktop` and open `/web/animation-smoke.html` for desktop QA. The frame buttons pause the real visual layers for alignment checks; **Live check** exercises the X, input lock, real register reset, history/theme preservation, cleanup, Undo, and subsequent arithmetic. Temporary QA pages must be deleted after testing and are never bundled into Expo. The current root suite passes 124 tests. These include reset transaction tests in `../tests/reset-animation.test.ts` and shared-motion tests in `../tests/reset-motion.test.ts`: duration below two seconds, component exposure time, hidden incoming layer, precise landing, continuity, repeated triggers, interruptions, reduced motion, and animation failure. Physical iPhone frame rate and WebKit compositing still need device verification; these tests do not establish 60 FPS on a device.

Gesture regression checks cover all eight drawing directions, imperfect paths, negative shapes, canceled/multi-touch gestures, and trailing-click suppression. For the local browser integration check, run `node scripts/smoke-restart.mjs` in mobile, open `/web/mobile-smoke.html` on the preview server, and click **Run restart integration check**. The generated page uses isolated mock native storage. Delete it after checking; it is not part of the app bundle.

The LCD absorbs extra phone height while the footer leaves a roughly key-height rest area (at least 44 points, including home-indicator clearance). Short screens can scroll within the app without shrinking keys. Define stops below the LCD; only its content scrolls, and the keyboard reduces the available sheet height. Native page zoom is disabled, and search uses a 16-point font to avoid focus zoom.

The status area is a continuous plastic band across the phone. The LCD starts below the reported top safe area, with a slim border and rounded corners. Status icons use contrast against the plastic color. No custom island outline is drawn. Worksheet labels use 16-point type with 12-point worksheet names.

Define focuses its stationary dialog on opening, rather than an offscreen moving button. A separate fixed viewport clips the animated sheet below the LCD, and its scrolling body has its own paint boundary. Validate opening, repeated opening, scrolling, and keyboard behavior on the actual iPhone after reloading; desktop browser checks cannot fully reproduce WKWebView compositing.

References: [Expo project setup](https://docs.expo.dev/get-started/create-a-project/), [WebView in Expo Go](https://docs.expo.dev/versions/v57.0.0/sdk/webview/), [Haptics](https://docs.expo.dev/versions/v57.0.0/sdk/haptics/).
