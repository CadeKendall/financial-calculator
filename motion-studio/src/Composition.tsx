/* eslint-disable @remotion/even-dimensions -- This is an interactive app preview at exact captured CSS dimensions, not an H264 export. */
import type { CSSProperties } from "react";
import {
  AbsoluteFill,
  Composition,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  RESET_TIMING,
  RESET_TRACKS,
  poseToStyle,
  sampleResetTrack,
} from "../../web/reset-motion.js";
import { resetInternalsMarkup } from "../../web/reset-internals.js";
import fixture from "./faceplate-fixture.json";

// Resolved DOM from the real app, not a second calculator design.
const faceplateHtml = fixture.html.replace(
  '<div class="reset-panel-shadow"></div>',
  "",
);
const internalsHtml = resetInternalsMarkup({
  width: fixture.width,
  height: fixture.height,
  screen: fixture.screen,
  keys: fixture.keys,
  prefix: "studio-reset-board",
});

const panelStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: fixture.caseColor,
  borderRadius: fixture.radius,
  transformOrigin: "50% 45%",
  backfaceVisibility: "hidden",
  pointerEvents: "none",
};
const shadowStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: "inherit",
  boxShadow: "0 24px 38px #0007",
};

export const FaceplateReset = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const milliseconds = interpolate(frame, [0, fps], [0, 1000], {
    extrapolateLeft: "clamp",
  });
  const seated = milliseconds >= RESET_TIMING.seated;

  return (
    <AbsoluteFill
      aria-hidden="true"
      style={{
        background: fixture.caseColor,
        overflow: "hidden",
        isolation: "isolate",
        pointerEvents: "none",
      }}
    >
      <div
        data-layer="live-calculator"
        style={panelStyle}
        dangerouslySetInnerHTML={{ __html: faceplateHtml }}
      />
      {!seated && (
        <>
          <div
            data-layer="stationary-components"
            style={{
              ...panelStyle,
              overflow: "hidden",
              background: `color-mix(in srgb, ${fixture.caseColor} 80%, #070909)`,
              boxShadow: `inset 0 0 0 7px ${fixture.caseColor}, inset 0 0 0 9px #ffffff10, inset 0 5px 18px #0009`,
            }}
          >
            <div
              style={{ position: "absolute", inset: 0 }}
              dangerouslySetInnerHTML={{ __html: internalsHtml }}
            />
            <div
              data-layer="cavity-light"
              style={{
                position: "absolute",
                inset: 0,
                background: "#020706",
                ...poseToStyle(
                  sampleResetTrack(RESET_TRACKS.cavityLight, milliseconds),
                ),
              }}
            />
          </div>
          <div
            data-layer="replacement-faceplate"
            style={{
              ...panelStyle,
              zIndex: 2,
              ...poseToStyle(
                sampleResetTrack(RESET_TRACKS.incoming, milliseconds),
              ),
            }}
          >
            <div
              style={{
                ...shadowStyle,
                ...poseToStyle(
                  sampleResetTrack(RESET_TRACKS.incomingShadow, milliseconds),
                ),
              }}
            />
            <div dangerouslySetInnerHTML={{ __html: faceplateHtml }} />
          </div>
          <div
            data-layer="departing-faceplate"
            style={{
              ...panelStyle,
              zIndex: 3,
              ...poseToStyle(
                sampleResetTrack(RESET_TRACKS.outgoing, milliseconds),
              ),
            }}
          >
            <div
              style={{
                ...shadowStyle,
                ...poseToStyle(
                  sampleResetTrack(RESET_TRACKS.outgoingShadow, milliseconds),
                ),
              }}
            />
            <div dangerouslySetInnerHTML={{ __html: faceplateHtml }} />
          </div>
        </>
      )}
      <div
        data-layer="lcd-refresh"
        style={{
          position: "absolute",
          left: fixture.screen.x,
          top: fixture.screen.y,
          width: fixture.screen.width,
          height: fixture.screen.height,
          borderRadius: 12,
          zIndex: 4,
          background: `color-mix(in srgb, ${fixture.screenColor} 76%, white)`,
          ...poseToStyle(sampleResetTrack(RESET_TRACKS.refresh, milliseconds)),
        }}
      />
    </AbsoluteFill>
  );
};

export const MyComposition = () => (
  <Composition
    id="BAIIPlusReset"
    component={FaceplateReset}
    durationInFrames={Math.round((RESET_TIMING.total / 1000) * 60)}
    fps={60}
    width={375}
    height={813}
  />
);
