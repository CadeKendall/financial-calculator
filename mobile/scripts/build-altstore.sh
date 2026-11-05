#!/usr/bin/env bash
# Runs on the EAS macOS builder; AltStore supplies the signing on installation.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This step requires the EAS macOS builder (or a Mac with Xcode)." >&2
  exit 1
fi

build_dir="$PWD/build/altstore"
mkdir -p "$build_dir"
xcodebuild \
  -workspace ios/FinancialCalculator.xcworkspace \
  -scheme FinancialCalculator \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -archivePath "$build_dir/FinancialCalculator.xcarchive" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY='' \
  DEVELOPMENT_TEAM='' \
  archive

shopt -s nullglob
apps=("$build_dir/FinancialCalculator.xcarchive/Products/Applications/"*.app)
if [[ ${#apps[@]} -ne 1 ]]; then
  echo "Expected exactly one archived iPhone application." >&2
  exit 1
fi
app="${apps[0]}"
platform=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleSupportedPlatforms:0' "$app/Info.plist")
if [[ "$platform" != "iPhoneOS" ]] || [[ ! -s "$app/main.jsbundle" ]]; then
  echo "The IPA must contain a device release with its JavaScript bundled for offline use." >&2
  exit 1
fi

# A unique staging folder prevents old app contents from leaking into a rebuild.
staging=$(mktemp -d "$build_dir/package.XXXXXX")
mkdir "$staging/Payload"
ditto "$app" "$staging/Payload/$(basename "$app")"
(
  cd "$staging"
  ditto -c -k --keepParent Payload "$build_dir/FinancialCalculator.ipa"
)
echo "Created unsigned iPhone release: $build_dir/FinancialCalculator.ipa"
echo "Install with AltStore Classic, which signs it using your Apple account."
