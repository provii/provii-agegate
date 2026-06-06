// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Styled QR code renderer using the `qr-code-styling` library.
 *
 * Renders gradient-themed QR codes that match the Provii brand. The canvas
 * element receives ARIA attributes (`role="img"`, `aria-label`) so that
 * screen readers announce it as a meaningful image.
 *
 * @module ui/StyledQR
 */

import type { Options } from "qr-code-styling";

// qr-code-styling is a CJS package. Under Node16 module resolution the
// default-import resolves to the module namespace rather than the class
// constructor.  We define a minimal interface for the methods we use and
// resolve the constructor from the imported namespace at init time to
// handle the CJS/ESM interop mismatch.
interface QRCodeStylingInstance {
  update(options?: Partial<Options>): void;
  append(container?: HTMLElement): void;
}

type QRCodeStylingConstructor = new (
  options?: Partial<Options>,
) => QRCodeStylingInstance;

import QRCodeStylingLib from "qr-code-styling";
const QRCodeStyling: QRCodeStylingConstructor =
  typeof (QRCodeStylingLib as unknown as { default: QRCodeStylingConstructor })
    .default === "function"
    ? (QRCodeStylingLib as unknown as { default: QRCodeStylingConstructor })
        .default
    : (QRCodeStylingLib as unknown as QRCodeStylingConstructor);

import type {
  QrDotStyle,
  QrEyeFrameStyle,
  QrEyeDotStyle,
} from "../modes/bridge-schema.js";

/**
 * Brand gradient colour triple. Either the default Provii navy/purple/orange
 * ramp or a caller-supplied override (e.g. via AutoBlockConfig.accentGradient).
 */
type AccentGradientStops = readonly [string, string, string];

/**
 * Structural options for the QR code that go beyond CSS variables.
 * When any of these change, the StyledQR must be torn down and rebuilt.
 */
export interface QrStyleOptions {
  /** Override the dot (module) shape. Default "dots". */
  readonly dotStyle?: QrDotStyle;
  /** Override the eye frame shape. Default "extra-rounded". */
  readonly eyeFrameStyle?: QrEyeFrameStyle;
  /** Override the inner eye dot shape. Default "square". */
  readonly eyeDotStyle?: QrEyeDotStyle;
  /** HTTPS URL of an image to embed in the centre of the QR code. */
  readonly logoUrl?: string;
  /**
   * Flat foreground colour applied to dots, eye frames, and eye dots
   * when set. Takes precedence over the `--ag-qr-fg` CSS var lookup,
   * which is unreliable because construction happens while the
   * container is still inside a detached DocumentFragment and
   * getComputedStyle returns empty values for detached elements.
   */
  readonly fgColour?: string;
  /**
   * Flat background colour. Same rationale as fgColour: an explicit
   * value bypasses the `--ag-qr-bg` CSS-var lookup.
   */
  readonly bgColour?: string;
}

/** Default Provii brand gradient: teal → violet → pink. */
const DEFAULT_ACCENT_GRADIENT_STOPS: AccentGradientStops = [
  "#0091C7",
  "#5B3DF5",
  "#C23AD6",
];

/**
 * Regex matching the three hex colours inside a standard
 * `linear-gradient(..., #xxxxxx ..%, #xxxxxx ..%, #xxxxxx ..%)` declaration.
 * Used to extract the colours from the `--ag-accent-gradient` CSS variable
 * so the qr-code-styling library (which takes hex strings, not CSS values)
 * can stay brand-aligned without duplicating the palette.
 */
const HEX_TRIPLE_RE = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/g;

/**
 * Read `--ag-qr-bg` from the given element's computed style. Returns null
 * when the variable is absent or empty so callers fall back to white.
 */
function parseQrBgToken(element: HTMLElement | null): string | null {
  if (!element || typeof getComputedStyle !== "function") return null;
  try {
    const value = getComputedStyle(element)
      .getPropertyValue("--ag-qr-bg")
      .trim();
    if (!value) return null;
    // Accept any valid CSS colour token the library can consume.
    return value;
  } catch {
    return null;
  }
}

/**
 * Read `--ag-qr-fg` from the given element's computed style. Returns null
 * when the variable is absent or empty so callers fall back to the accent
 * gradient for dot colouring.
 */
function parseQrFgToken(element: HTMLElement | null): string | null {
  if (!element || typeof getComputedStyle !== "function") return null;
  try {
    const value = getComputedStyle(element)
      .getPropertyValue("--ag-qr-fg")
      .trim();
    if (!value) return null;
    return value;
  } catch {
    return null;
  }
}

/**
 * Attempt to parse three hex colours from the --ag-accent-gradient token on
 * the given element's computed style. Returns null when the variable is
 * absent or does not contain three hex colours (in which case callers fall
 * back to the Provii default triple).
 */
function parseAccentGradientToken(
  element: HTMLElement | null,
): AccentGradientStops | null {
  if (!element || typeof getComputedStyle !== "function") return null;
  try {
    const value = getComputedStyle(element)
      .getPropertyValue("--ag-accent-gradient")
      .trim();
    if (!value) return null;
    const matches = value.match(HEX_TRIPLE_RE);
    if (!matches || matches.length < 3) return null;
    return [matches[0], matches[1], matches[2]] as AccentGradientStops;
  } catch {
    return null;
  }
}

/**
 * Branded QR code component that renders into a given container element.
 *
 * On construction the QR code is appended to `container`. Call
 * {@link update} to change the encoded data and {@link destroy} to remove
 * it from the DOM.
 */
export class StyledQR {
  private qr: QRCodeStylingInstance;
  private container: HTMLElement | null = null;
  private observer: MutationObserver | null = null;

  constructor(
    container: HTMLElement,
    initialData: string = "",
    accentGradient?: AccentGradientStops,
    qrStyleOptions?: QrStyleOptions,
  ) {
    this.container = container;

    // Defensively re-apply ARIA attributes whenever the qr-code-styling
    // library replaces the canvas element. The library's update() currently
    // does this synchronously, but a MutationObserver guards against future
    // changes to the library's internal behaviour.
    this.observer = new MutationObserver(() => {
      const canvas = container.querySelector("canvas");
      if (canvas && !canvas.hasAttribute("role")) {
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", "QR code for age verification");
      }
    });
    this.observer.observe(container, { childList: true, subtree: true });

    // Resolve gradient: explicit override > --ag-accent-gradient token > default.
    const stops: AccentGradientStops =
      accentGradient ??
      parseAccentGradientToken(container) ??
      DEFAULT_ACCENT_GRADIENT_STOPS;
    const [gradientStart, gradientMid, gradientEnd] = stops;

    // Resolve QR background: explicit option > --ag-qr-bg token > white.
    // Explicit option wins because the container may still live inside
    // a detached DocumentFragment at construction time, and
    // getComputedStyle returns empty for detached elements.
    const qrBgColour =
      qrStyleOptions?.bgColour ?? parseQrBgToken(container) ?? "#ffffff";

    // Resolve QR foreground: explicit option > --ag-qr-fg token > null
    // (null triggers the accent-gradient path). Same detached-fragment
    // rationale as qrBgColour.
    const qrFgColour = qrStyleOptions?.fgColour ?? parseQrFgToken(container);

    // Resolve dot, eye frame, and eye dot styles from options.
    const dotType = qrStyleOptions?.dotStyle ?? "dots";
    const eyeFrameType = qrStyleOptions?.eyeFrameStyle ?? "extra-rounded";
    const eyeDotType = qrStyleOptions?.eyeDotStyle ?? "square";

    // Build dots options: flat foreground colour takes precedence over gradient.
    const dotsOptions: Partial<Options>["dotsOptions"] = qrFgColour
      ? { type: dotType, color: qrFgColour }
      : {
          type: dotType,
          gradient: {
            type: "linear",
            rotation: 0,
            colorStops: [
              { offset: 0, color: gradientStart },
              { offset: 0.5, color: gradientMid },
              { offset: 1, color: gradientEnd },
            ],
          },
        };

    // Build corner square (eye frame) options.
    const cornersSquareOptions: Partial<Options>["cornersSquareOptions"] =
      qrFgColour
        ? { type: eyeFrameType, color: qrFgColour }
        : {
            type: eyeFrameType,
            gradient: {
              type: "linear",
              rotation: 180,
              colorStops: [
                { offset: 0, color: gradientStart },
                { offset: 1, color: gradientMid },
              ],
            },
          };

    // Build corner dot (eye inner) options.
    const cornersDotOptions: Partial<Options>["cornersDotOptions"] = qrFgColour
      ? { type: eyeDotType, color: qrFgColour }
      : { type: eyeDotType, color: gradientEnd };

    // Bump error correction to H when a logo is embedded so the QR stays
    // scannable despite the centre being obscured.
    const errorCorrectionLevel = qrStyleOptions?.logoUrl ? "H" : "Q";

    const qrOptions: Partial<Options> = {
      width: 200,
      height: 200,
      type: "canvas",
      data: initialData,
      dotsOptions,
      cornersSquareOptions,
      cornersDotOptions,
      backgroundOptions: {
        color: qrBgColour,
      },
      qrOptions: {
        typeNumber: 0,
        mode: "Byte",
        errorCorrectionLevel,
      },
    };

    // Embedded logo image (optional).
    if (qrStyleOptions?.logoUrl) {
      qrOptions.image = qrStyleOptions.logoUrl;
      qrOptions.imageOptions = {
        hideBackgroundDots: true,
        imageSize: 0.3,
        margin: 4,
        crossOrigin: "anonymous",
      };
    }

    this.qr = new QRCodeStyling(qrOptions);

    this.qr.append(container);

    // Add accessible name to the rendered canvas
    const canvas = container.querySelector("canvas");
    if (canvas) {
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", "QR code for age verification");
    }
  }

  /** Replace the QR code payload and re-render the canvas. */
  update(data: string): void {
    this.qr.update({ data });
    // Re-apply accessible attributes after QR library re-renders canvas
    if (this.container) {
      const canvas = this.container.querySelector("canvas");
      if (canvas) {
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", "QR code for age verification");
      }
    }
  }

  /** Remove the QR code from the DOM and release resources. */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.container) {
      this.container.innerHTML = "";
    }
  }
}
