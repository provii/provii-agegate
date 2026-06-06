<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/provii-logo-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="./assets/provii-logo-light.png">
    <img alt="Provii" src="./assets/provii-logo-light.png" width="200">
  </picture>
</p>

<h1 align="center">provii-agegate</h1>

<p align="center">One script tag. Age verified. No backend required.</p>

<p align="center">
  <a href="https://github.com/provii/provii-agegate/actions/workflows/ci.yml"><img src="https://github.com/provii/provii-agegate/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/provii/provii-agegate/blob/main/LICENSE"><img src="https://img.shields.io/badge/licence-MIT-blue" alt="Licence MIT"></a>
  <img src="https://img.shields.io/badge/bundle-334%20KiB%20%2F%2094%20KiB%20gz-brightgreen" alt="Bundle size">
  <img src="https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript&logoColor=white" alt="TypeScript strict">
</p>

## Install

```html
<script
  src="https://cdn.provii.app/sdk/provii-agegate/v0.1.3/agegate.browser.js"
  data-public-key="pk_live_your64hexchars..."
></script>
```

The script detects the `data-public-key` attribute and blocks the page with a full viewport overlay. Once the user proves their age via the Provii Wallet, the overlay is removed. No other code needed.

For bundler environments:

```bash
npm install provii-agegate
```

```typescript
import { AgeGate } from 'provii-agegate';

const gate = new AgeGate({
  publicKey: 'pk_live_abc123...',
  contentUrl: '/verified-content',
  mountElementId: 'age-gate',
});

gate.init();
```

## Configuration

### Script tag attributes (autoload mode)

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `data-public-key` | `string` | *required* | Your organisation's public key. Format: `pk_live_<64 hex>` (production) or `pk_test_<64 hex>` (sandbox) |
| `data-environment` | `"production" \| "sandbox"` | `"production"` | Selects API endpoints. Sandbox uses `sandbox-hosted.provii.app` |
| `data-theme` | `"light" \| "dark" \| "auto"` | `"auto"` | Colour theme. `auto` follows `prefers-color-scheme` |
| `data-lang` | BCP 47 tag | Browser locale | UI language override. Falls back to `en` if the locale is not bundled. 15 locales ship: ar, de, en, es, fr, hi, it, ja, ko, nl, pl, pt, ru, tr, zh |
| `data-style` | `"modern" \| "minimal" \| "custom"` | `"modern"` | UI style preset. `custom` requires `data-custom-styles` |
| `data-on-unavailable` | `"block" \| "allow" \| "defer"` | *choose explicitly* | What to do if Provii is unreachable. See [Failure handling](#failure-handling). Omitting it fails **closed** (block) and logs an error; it never silently lets users through |
| `data-allow-close` | `boolean` | `false` | Show a close button on the overlay |
| `data-csp-nonce` | `string` | none | Base64 nonce applied to injected `<style>` elements for strict CSP |
| `data-debug` | `boolean` | `false` | Emit `console.debug` messages during the verification flow |
| `data-logo-url` | HTTPS URL | Provii shield | Brand logo rendered in the header circle. Must be `https://` or `data:image/` (no SVG data URIs) |
| `data-logo-svg` | SVG markup | none | Inline SVG for the header logo. Sanitised via DOMPurify. Takes precedence over `data-logo-url` |
| `data-brand-color` | `#rrggbb` or `#rgb` | `#0091C7` | Sets `--ag-accent-start`, controlling CTA borders, focus rings, spinner, footer links |
| `data-accent-gradient` | `"#hex,#hex,#hex"` or CSS gradient | `linear-gradient(135deg, #0091C7, #5B3DF5, #C23AD6)` | Comma-separated hex stops or a full CSS gradient value |
| `data-privacy-policy-url` | HTTPS URL | none | Renders a privacy policy link in the footer |
| `data-container-radius` | `0`-`64` | `16` | Container corner radius in px |
| `data-button-radius` | `0`-`64` | `12` | Button corner radius in px |
| `data-font-family` | CSS font stack | `Manrope, system` | Font family. Stripped of `;{}<>` for safety |
| `data-motion-duration` | `0`-`2000` | `400` | Animation duration in ms. Clamped to `0` when `prefers-reduced-motion` matches |
| `data-backdrop-opacity` | `0`-`100` | `95` | Modal backdrop alpha as a percentage |
| `data-gradient-angle` | `0`-`360` | `135` | Gradient rotation in degrees |
| `data-button-text-colour` | `#rrggbb` | `#ffffff` | CTA button text colour |
| `data-strings` | JSON | none | String overrides object, e.g. `'{"headerTitle":"Age check"}'` |

### QR code styling attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `data-qr-foreground` | `#rrggbb` | accent gradient | QR dot and frame colour |
| `data-qr-background` | `#rrggbb` | `#ffffff` | QR canvas background |
| `data-qr-dot-style` | `dots \| rounded \| classy \| classy-rounded \| square \| extra-rounded` | `dots` | Shape of individual QR dots |
| `data-qr-eye-frame-style` | `dot \| square \| extra-rounded` | none | Shape of the corner finder frames |
| `data-qr-eye-dot-style` | `dot \| square` | none | Shape of the inner corner dots |
| `data-qr-logo-url` | HTTPS URL | none | Logo embedded in the QR centre |

### Programmatic options (manual mode)

Pass these to `new AgeGate(options)` or `new AgeGateConfig(options)`:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `publicKey` | `string` | *required* | `pk_live_<64 hex>` or `pk_test_<64 hex>` |
| `contentUrl` | `string` | *required* | Same origin URL to redirect to after verification |
| `mountElementId` | `string` | *required* | DOM element ID where the gate mounts |
| `onUnavailable` | `"block" \| "allow" \| "defer"` | *choose explicitly* | What to do if Provii is unreachable. See [Failure handling](#failure-handling). Omitting it fails **closed** and logs an error; an invalid value throws |
| `onUnavailableHandler` | `(info) => void` | none | Called when `onUnavailable` is `"defer"`, so you can route to a fallback provider. Receives `{ reason, code }` |
| `environment` | `"production" \| "sandbox"` | `"production"` | API environment |
| `theme` | `"light" \| "dark" \| "auto"` | `"auto"` | Colour theme |
| `lang` | BCP 47 tag | Browser locale | UI language override |
| `strings` | `Partial<LocaleStrings>` | none | String overrides for any locale key |
| `pollInterval` | `500`-`60000` | `3000` | Status polling interval in ms |
| `challengeUrl` | `string` | Environment default | Override the challenge endpoint |
| `statusUrl` | `string` | Environment default | Override the status endpoint. Must contain `{sid}` |
| `redeemUrl` | `string` | none | PKCE redemption endpoint for RP proxy mode |
| `redeemMode` | `"rp-proxy" \| "direct"` | `"direct"` | `rp-proxy` sends redemption through your backend |
| `pollUrl` | `string` | none | Status polling endpoint for RP proxy mode |
| `cspNonce` | `string` | none | Base64 nonce for injected style elements |
| `allowedDomains` | `string[]` | `["hosted.provii.app", "sandbox-hosted.provii.app"]` | SSRF domain allowlist for API URLs |
| `verifyingKeyId` | `0`-`9999999999` | `2031517468` | ZK circuit verifying key ID |

## Framework examples

### React

```tsx
import { useEffect, useRef } from 'react';
import { AgeGate } from 'provii-agegate';

export function AgeGateWidget() {
  const ref = useRef<AgeGate | null>(null);

  useEffect(() => {
    const gate = new AgeGate({
      publicKey: 'pk_live_abc123...',
      contentUrl: '/dashboard',
      mountElementId: 'age-gate',
    });
    ref.current = gate;
    gate.init();
    return () => gate.dispose();
  }, []);

  return <div id="age-gate" />;
}
```

### Vue

```vue
<template>
  <div id="age-gate" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { AgeGate } from 'provii-agegate';

let gate: AgeGate;

onMounted(() => {
  gate = new AgeGate({
    publicKey: 'pk_live_abc123...',
    contentUrl: '/verified',
    mountElementId: 'age-gate',
  });
  gate.init();
});

onUnmounted(() => gate?.dispose());
</script>
```

### Astro

```astro
---
// src/pages/restricted.astro
---
<div id="age-gate"></div>

<script>
  import { AgeGate } from 'provii-agegate';

  const gate = new AgeGate({
    publicKey: 'pk_live_abc123...',
    contentUrl: '/content',
    mountElementId: 'age-gate',
  });
  gate.init();
</script>
```

### Plain HTML

```html
<div id="age-gate"></div>

<script type="module">
  import { AgeGate } from 'https://cdn.provii.app/sdk/provii-agegate/v0.1.3/index.js';

  const gate = new AgeGate({
    publicKey: 'pk_live_abc123...',
    contentUrl: '/over-18',
    mountElementId: 'age-gate',
  });
  gate.init();
</script>
```

## Customisation

The widget renders inside a closed Shadow DOM, so page styles cannot leak in and the gate's styles cannot leak out. CSS custom properties do inherit across shadow boundaries. Override them from your own stylesheet:

```css
:root {
  --ag-bg: #1a1a2e;
  --ag-text: #eaeaea;
  --ag-accent-start: #e94560;
  --ag-accent-gradient: linear-gradient(135deg, #e94560 0%, #0f3460 100%);
  --ag-radius-container: 24px;
  --ag-radius-button: 8px;
  --ag-font-family: 'Inter', sans-serif;
}
```

All available custom properties, with their light theme defaults:

| Property | Default | Controls |
|----------|---------|----------|
| `--ag-bg` | `#FFFFFF` | Main background |
| `--ag-bg-subtle` | `#F8FAFC` | Secondary background (gate container, badges) |
| `--ag-text` | `#1F2937` | Primary text colour |
| `--ag-text-secondary` | `#6B7280` | Secondary text and captions |
| `--ag-border` | `#E5E7EB` | Border colour |
| `--ag-accent-start` | `#0091C7` | Primary accent (links, focus rings, spinner) |
| `--ag-accent-mid` | `#5B3DF5` | Gradient midpoint |
| `--ag-accent-end` | `#C23AD6` | Gradient endpoint |
| `--ag-accent-gradient` | `linear-gradient(135deg, #0091C7 0%, #5B3DF5 50%, #C23AD6 100%)` | CTA button, header background |
| `--ag-error` | `#C62020` | Error text and icons |
| `--ag-warning` | `#D97706` | Timeout icon colour |
| `--ag-success` | `#047857` | Success text |
| `--ag-radius-container` | `16px` | Container border radius |
| `--ag-radius-button` | `12px` | Button border radius |
| `--ag-font-family` | `'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` | Font stack |
| `--ag-logo-size` | `64px` | Header logo dimensions |
| `--ag-motion-duration` | `0.4s` | Entrance animation duration |
| `--ag-shadow` | `0 4px 24px rgba(0,0,0,0.08)` | Container box shadow |
| `--ag-qr-bg` | `#FFFFFF` | QR code canvas background |
| `--ag-focus-ring` | `0 0 0 3px rgba(0,145,199,0.4)` | Focus ring box shadow |
| `--ag-button-text` | `#ffffff` | CTA button text |

Dark mode activates automatically via `prefers-color-scheme: dark` or explicitly with `data-theme="dark"` / `theme: "dark"`.

## Events

The autoload mode instance is available at `window.ProviiAgeGate`. Subscribe to lifecycle events:

```javascript
window.ProviiAgeGate.on('verified', (data) => {
  console.log('Verified at', data.verifiedAt);
});

window.ProviiAgeGate.on('error', (data) => {
  console.error(data.code, data.message);
});
```

| Event | Payload | Fires when |
|-------|---------|------------|
| `verified` | `{ sessionId, verifiedAt }` | User successfully verified |
| `error` | `{ code, message }` | Verification or redemption fails |
| `timeout` | `{ message }` | Polling exceeds the timeout window |
| `expired` | `{ message }` | Server marks the session as expired |
| `statusUpdate` | `{ sessionId, status, proofVerified }` | Each poll response |
| `unavailable` | `{ action, reason, code? }` | Provii could not return a verdict (an outage); the configured failure mode was applied. See [Failure handling](#failure-handling) |
| `closed` | `{}` | User closes the overlay (when `allowClose` is true) |

In manual mode, use `subscribe` instead:

```typescript
const unsubscribe = gate.subscribe((state, context) => {
  // state: 'idle' | 'fetching' | 'rendered' | 'polling' | 'waiting' | 'timeout' | 'verified' | 'failed'
  // context.serviceUnavailable === true when a terminal state was caused by
  // Provii being unreachable (rather than a genuine "underage"/"failed" verdict)
});
```

## Failure handling

Age verification sits in front of your content, so you decide what happens when **Provii cannot be reached** (network failure, outage, exhausted retries). You make that choice explicitly with `onUnavailable` / `data-on-unavailable`:

| Mode | Behaviour when Provii is unreachable | Trade-off |
|------|--------------------------------------|-----------|
| `block` | Keep the gate up and show the retry prompt (**fail closed**) | No one passes during the outage, but Provii is a hard dependency on your page |
| `allow` | Reveal the content (**fail open**) | Your page never breaks, but unverified users reach gated content during the outage. You accept that compliance risk |
| `defer` | Stay blocked, emit `unavailable`, and call `onUnavailableHandler` | Hand off to a fallback age-verification provider or your own logic |

This **only** applies to availability failures. A genuine verifier rejection (the user is underage, or the proof failed) **always blocks**, regardless of this setting. Cryptographic rejections are never failed open.

There is no default: if you omit the option the gate fails **closed** and logs an error, because silently letting users through during an outage is never a safe default. Choose deliberately, in line with your regulatory obligations. See the [resilience and shared-responsibility guide](https://docs.provii.app/guides/resilience-and-failover) for how to pick.

```html
<!-- Autoload: fail open during an outage -->
<script
  src="https://cdn.provii.app/sdk/provii-agegate/v0.1.3/agegate.browser.js"
  data-public-key="pk_live_..."
  data-on-unavailable="allow"
></script>
```

```typescript
// Manual mode: defer to a fallback provider during an outage
const gate = new AgeGate({
  publicKey: 'pk_live_...',
  contentUrl: '/over-18',
  mountElementId: 'age-gate',
  onUnavailable: 'defer',
  onUnavailableHandler: ({ reason }) => {
    // Provii is down; hand the user to your secondary provider
    window.location.href = `/age-check/fallback?reason=${reason}`;
  },
});
gate.init();
```

```javascript
// Autoload: drive your own fallback from the unavailable event
window.ProviiAgeGate.on('unavailable', ({ action, reason }) => {
  if (action === 'defer') {
    window.location.href = '/age-check/fallback';
  }
});
```

## Bundle size

The minified IIFE browser bundle is 334 KiB (94 KiB gzipped). That includes full theme CSS, 15 locale packs, the XState state machine, DOMPurify for SVG sanitisation, and QR code rendering. Zero server-side dependencies.

Runtime dependencies bundled in: `xstate`, `dompurify`, `qr-code-styling`, `qrcode`.

## Localisation

15 languages ship in the bundle: Arabic, Chinese, Dutch, English, French, German, Hindi, Italian, Japanese, Korean, Polish, Portuguese, Russian, Spanish, Turkish.

Detection order: `data-lang` attribute, then `html[lang]`, then `navigator.language`, then English. RTL layout activates automatically for Arabic.

Override any string with the `strings` option or a sibling JSON script element:

```html
<script type="application/json" data-agegate-strings>
  { "headerTitle": "Verify your age", "verifyButtonLabel": "Open wallet" }
</script>
```

## Security

PKCE (RFC 7636) challenge generation, session management via HttpOnly cookies, SSRF protection through domain allowlists, and CSP nonce support for injected styles. All cryptographic operations run through the Web Crypto API. The entire widget sits inside a closed Shadow DOM to isolate styles and prevent DOM tampering from the host page.

SRI hashes are published with every release. Pin the exact version and hash in production:

```html
<script
  src="https://cdn.provii.app/sdk/provii-agegate/v0.1.3/agegate.browser.js"
  integrity="sha384-2YgklkdwmF3u5HNQBha6kV/fXphpO0quuQ2dR1jN+1SAolpkdGEFrql40VBv3Phq"
  crossorigin="anonymous"
  data-public-key="pk_live_..."
></script>
```

## Licence

MIT. See [LICENSE](LICENSE).
