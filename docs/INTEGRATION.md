# Provii AgeGate Integration Guide

This guide explains how to consume Provii AgeGate artifacts with proper verification and supply chain security.

## Table of Contents

- [Overview](#overview)
- [Artifact Types](#artifact-types)
- [Security & Verification](#security--verification)
- [Installation Methods](#installation-methods)
  - [Option 1: npm Package (Recommended)](#option-1-npm-package-recommended)
  - [Option 2: CDN with SRI](#option-2-cdn-with-sri)
  - [Option 3: GitHub Releases](#option-3-github-releases)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)

## Overview

Provii AgeGate is built with SLSA Level 3 supply chain security. Builds are hermetic with locked dependencies. Sigstore signs every artifact and generates non-falsifiable provenance attestations. SRI hashes ship alongside browser bundles for integrity verification. Security audits run before every build.

Every release is signed and attested. Consumers can independently verify provenance back to the source commit.

## Artifact Types

Each release contains:

| Artifact | Description | Use Case |
|----------|-------------|----------|
| `provii-agegate-X.Y.Z.tgz` | npm package (ESM + CJS + types) | Node.js, bundlers (webpack, vite) |
| `agegate.browser.js` | Browser bundle (IIFE, minified) | Direct `<script>` tag inclusion |
| `agegate.browser.js.sri` | SRI hash for browser bundle | CDN integrity verification |
| `*.cosign-bundle` | Sigstore signature bundles | Cryptographic verification |
| `CHECKSUMS.txt` | SHA256 checksums for all files | Integrity verification |
| `provii-agegate.intoto.jsonl` | SLSA provenance attestation | Supply chain verification |

## Security & Verification

### Prerequisites

Install verification tools:

```bash
# Cosign (for signature verification)
curl -LO https://github.com/sigstore/cosign/releases/download/v2.4.1/cosign-linux-amd64
sudo install cosign-linux-amd64 /usr/local/bin/cosign

# SLSA Verifier (for provenance)
curl -LO https://github.com/slsa-framework/slsa-verifier/releases/download/v2.5.1/slsa-verifier-linux-amd64
sudo install slsa-verifier-linux-amd64 /usr/local/bin/slsa-verifier
```

### Verification Steps

**1. Download artifacts from GitHub Release:**

```bash
VERSION="v0.1.1"  # Replace with desired version
BASE_URL="https://github.com/provii/provii-agegate/releases/download/${VERSION}"

wget "${BASE_URL}/provii-agegate-0.1.1.tgz"
wget "${BASE_URL}/provii-agegate-0.1.1.tgz.sha256"
wget "${BASE_URL}/provii-agegate-0.1.1.tgz.cosign-bundle"
wget "${BASE_URL}/provii-agegate.intoto.jsonl"
```

**2. Verify checksum:**

```bash
sha256sum -c provii-agegate-0.1.1.tgz.sha256
# Expected: provii-agegate-0.1.1.tgz: OK
```

**3. Verify Sigstore signature:**

```bash
export COSIGN_EXPERIMENTAL=1

cosign verify-blob \
  --bundle provii-agegate-0.1.1.tgz.cosign-bundle \
  --certificate-identity-regexp="https://github.com/provii/provii-agegate/.*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  provii-agegate-0.1.1.tgz
```

Expected output: `Verified OK`

**4. Verify SLSA provenance:**

```bash
slsa-verifier verify-artifact \
  provii-agegate-0.1.1.tgz \
  --provenance-path provii-agegate.intoto.jsonl \
  --source-uri github.com/provii/provii-agegate
```

Expected output: `PASSED: Verified SLSA provenance`

## Installation Methods

### Option 1: npm Package (Recommended)

For Node.js applications or bundled browser apps (webpack, vite, etc.).

**Install:**

```bash
npm install provii-agegate
```

**Verify npm package (optional):**

```bash
# Download from npm
npm pack provii-agegate

# Verify matches GitHub release
wget https://github.com/provii/provii-agegate/releases/download/v0.1.1/provii-agegate-0.1.1.tgz.sha256
sha256sum -c provii-agegate-0.1.1.tgz.sha256
```

**Usage (ESM):**

```typescript
import { AgeGate } from 'provii-agegate';

const gate = new AgeGate({
  publicKey: 'pk_live_abc123...',
  contentUrl: '/verified-content',
  mountElementId: 'age-gate',
});

gate.init();
```

**Usage (CommonJS):**

```javascript
const { AgeGate } = require('provii-agegate');

const gate = new AgeGate({
  publicKey: 'pk_live_abc123...',
  contentUrl: '/verified-content',
});

gate.init();
```

### Option 2: CDN with SRI

For direct browser inclusion without a build step.

**1. Host the browser bundle on your CDN:**

```bash
# Download verified bundle
VERSION="v0.1.1"
wget "https://github.com/provii/provii-agegate/releases/download/${VERSION}/agegate.browser.js"
wget "https://github.com/provii/provii-agegate/releases/download/${VERSION}/agegate.browser.js.sri"

# Upload to your CDN (e.g., cdn.provii.app)
aws s3 cp agegate.browser.js s3://your-cdn-bucket/sdk/provii-agegate/${VERSION}/
```

**2. Include in HTML with SRI:**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Age Verification</title>
</head>
<body>
  <!-- Include provii-agegate with SRI integrity check -->
  <script
    src="https://cdn.provii.app/sdk/provii-agegate/v0.1.1/agegate.browser.js"
    integrity="sha384-m36QUlTqbIeTJy8CpsTEBJS1b3aLlKIJ4WUfcyUQyaM7c5sTUsy4+CHq5Idh2Qor"
    crossorigin="anonymous"></script>

  <script>
    // The autoload script self-initialises when it detects data-public-key.
    // For programmatic access after verification:
    window.ProviiAgeGate.on('verified', () => {
      console.log('Age verification complete');
    });
  </script>
</body>
</html>
```

**Get SRI hash:**

```bash
cat agegate.browser.js.sri
# Output: sha384-ABC123...
```

Or generate yourself:

```bash
openssl dgst -sha384 -binary agegate.browser.js | \
  openssl base64 -A | \
  awk '{print "sha384-" $0}'
```

### Option 3: GitHub Releases

Download and verify manually (for advanced users or custom setups).

**1. Download and verify:**

See [Security & Verification](#security--verification) section above.

**2. Extract and use:**

```bash
# Extract npm package
tar -xzf provii-agegate-0.1.1.tgz
cd package

# Use in your project
cp dist/index.js ../my-project/vendor/agegate.js
```

**3. Import in your code:**

```javascript
import * as AgeGate from './vendor/agegate.js';
```

## Usage Examples

### Script Tag (Autoload Mode)

The simplest integration. The SDK detects `data-public-key` and handles the entire flow automatically:

```html
<script
  src="https://cdn.provii.app/sdk/provii-agegate/v0.1.1/agegate.browser.js"
  data-public-key="pk_live_abc123..."
></script>
```

The overlay appears immediately. Once the user verifies via the Provii Wallet, the overlay is removed and the page content is revealed. No additional code needed.

### Programmatic (ESM)

For full control over the verification lifecycle:

```typescript
import { AgeGate } from 'provii-agegate';

const gate = new AgeGate({
  publicKey: 'pk_live_abc123...',
  contentUrl: '/verified-content',
  mountElementId: 'age-gate',
  environment: 'production',
  theme: 'auto',
  lang: 'en',
});

// Listen for verification events
gate.on('verified', () => {
  console.log('Age verification complete');
  // Reveal age-gated content
});

gate.on('error', (err) => {
  console.error('Verification failed:', err);
});

// Start the verification flow
await gate.init();

// Clean up when done
gate.dispose();
```

### Event Handling

The `AgeGate` instance emits events for each stage of the verification flow:

```typescript
gate.on('challenge-created', (data) => {
  // Challenge created, QR code or deep link displayed
});

gate.on('verified', () => {
  // User has verified their age
});

gate.on('expired', () => {
  // Challenge expired before verification
});

gate.on('error', (err) => {
  // Handle errors
});
```

## Troubleshooting

### Signature verification fails

```
Error: signature verification failed
```

**Possible causes:**
1. **Artifact was tampered with** - DO NOT USE
2. **Wrong certificate identity** - Check `--certificate-identity-regexp`
3. **Expired certificate** - Update cosign

**Debug:**

```bash
# Inspect signature bundle
cat provii-agegate-0.1.1.tgz.cosign-bundle | jq '.'
```

### SRI hash mismatch

```
Failed to find a valid digest in the 'integrity' attribute
```

**Cause:** Browser downloaded file doesn't match SRI hash.

**Solution:**
1. Verify SRI hash is correct (check release notes)
2. Ensure no CDN/proxy is modifying the file
3. Re-download from official source

### Module not found

```
Error: Cannot find module 'provii-agegate'
```

**Solution:**

```bash
# Ensure package is installed
npm list provii-agegate

# If not found, install
npm install provii-agegate

# Check imports match exports in package.json
```

### CORS errors

```
Access to fetch at 'https://hosted.provii.app/v1/challenge' has been blocked by CORS
```

**Cause:** Browser security prevents direct API calls from client-side code.

**Solution:** Always call verifier API through your backend:

```
Browser → Your Backend → Verifier API
```

Never expose API keys or signing secrets in browser code.

### Polling timeout

```
Challenge expired before verification completed
```

**Solution:**
- Increase `expiresIn` (default 300 seconds)
- Adjust polling interval
- Check wallet app is receiving deep link correctly

## Version Compatibility

Provii AgeGate follows [Semantic Versioning](https://semver.org/):

- **Major** (`v0.x.0` → `v1.0.0`): Breaking API changes
- **Minor** (`v0.1.x` → `v0.2.0`): New features, backward-compatible
- **Patch** (`v0.1.0` → `v0.1.1`): Bug fixes

**Upgrade strategy:**
- Pin to specific version in production: `"provii-agegate": "0.1.1"`
- Use caret for development: `"provii-agegate": "^0.1.1"`

## Additional Resources

- [Provii AgeGate README](../README.md)
- [Verifier API Documentation](https://docs.provii.app/api/verifier)
- [SLSA Framework](https://slsa.dev/)
- [Sigstore Documentation](https://docs.sigstore.dev/)

## Support

For integration issues:
1. Check [Troubleshooting](#troubleshooting) section
2. Review [GitHub Issues](https://github.com/provii/provii-agegate/issues)
3. Open a new issue with:
   - SDK version
   - Installation method (npm, CDN, manual)
   - Error logs
   - Steps to reproduce
