/**
 * @jest-environment jsdom
 */
// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * Mutation-killing tests for src/core/shadow-dom.ts.
 *
 * Every exported function, every conditional branch, every string literal,
 * and every return value is covered so Stryker cannot survive mutations.
 */

import {
  getOrCreateShadowRoot,
  injectStyles,
  getShadowRoot,
} from "../src/core/shadow-dom.js";
import { DEFAULT_THEME_CSS } from "../src/styles/theme.js";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

/** Fresh host <div> for each test that needs one. */
function createHost(): HTMLDivElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
}

/* ------------------------------------------------------------------ */
/* getOrCreateShadowRoot                                               */
/* ------------------------------------------------------------------ */

describe("getOrCreateShadowRoot", () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = createHost();
  });

  afterEach(() => {
    host.remove();
  });

  it("returns a ShadowRoot instance", () => {
    const shadow = getOrCreateShadowRoot(host);
    // ShadowRoot is the expected type; confirm it is not null/undefined
    expect(shadow).toBeDefined();
    expect(shadow).toBeInstanceOf(ShadowRoot);
  });

  it("attaches the shadow in closed mode (host.shadowRoot is null)", () => {
    getOrCreateShadowRoot(host);
    // Closed mode means the standard property returns null
    expect(host.shadowRoot).toBeNull();
  });

  it("calls attachShadow with mode 'closed'", () => {
    const spy = jest.spyOn(host, "attachShadow");
    getOrCreateShadowRoot(host);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ mode: "closed" });
    spy.mockRestore();
  });

  it("sets data-agegate-mount attribute on the host element", () => {
    getOrCreateShadowRoot(host);
    expect(host.hasAttribute("data-agegate-mount")).toBe(true);
    expect(host.getAttribute("data-agegate-mount")).toBe("");
  });

  it("sets data-agegate-mount to an empty string, not any other value", () => {
    getOrCreateShadowRoot(host);
    // Mutation: changing "" to some other string must fail
    const attrValue = host.getAttribute("data-agegate-mount");
    expect(attrValue).not.toBeNull();
    expect(attrValue).toStrictEqual("");
    expect(attrValue!.length).toBe(0);
  });

  it("injects the DEFAULT_THEME_CSS into the shadow root", () => {
    const shadow = getOrCreateShadowRoot(host);
    const styleElements = shadow.querySelectorAll("style");
    expect(styleElements.length).toBe(1);
    expect(styleElements[0]!.textContent).toBe(DEFAULT_THEME_CSS);
  });

  it("returns the same shadow root on repeated calls for the same host", () => {
    const first = getOrCreateShadowRoot(host);
    const second = getOrCreateShadowRoot(host);
    expect(second).toBe(first);
  });

  it("does not call attachShadow a second time for the same host", () => {
    getOrCreateShadowRoot(host);
    const spy = jest.spyOn(host, "attachShadow");
    getOrCreateShadowRoot(host);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("does not add duplicate style elements on repeated calls", () => {
    const shadow = getOrCreateShadowRoot(host);
    getOrCreateShadowRoot(host);
    const styleElements = shadow.querySelectorAll("style");
    expect(styleElements.length).toBe(1);
  });

  it("does not set the data-agegate-mount attribute twice", () => {
    const spy = jest.spyOn(host, "setAttribute");
    getOrCreateShadowRoot(host);
    const firstCallCount = spy.mock.calls.length;
    getOrCreateShadowRoot(host);
    // No additional setAttribute calls on the second invocation
    expect(spy.mock.calls.length).toBe(firstCallCount);
    spy.mockRestore();
  });

  it("creates independent shadow roots for different host elements", () => {
    const hostB = createHost();
    const shadowA = getOrCreateShadowRoot(host);
    const shadowB = getOrCreateShadowRoot(hostB);
    expect(shadowA).not.toBe(shadowB);
    hostB.remove();
  });

  it("applies a CSP nonce to the injected style element when provided", () => {
    const shadow = getOrCreateShadowRoot(host, "abc123");
    const styleEl = shadow.querySelector("style");
    expect(styleEl).not.toBeNull();
    expect(styleEl!.getAttribute("nonce")).toBe("abc123");
  });

  it("does not set a nonce attribute when cspNonce is omitted", () => {
    const shadow = getOrCreateShadowRoot(host);
    const styleEl = shadow.querySelector("style");
    expect(styleEl).not.toBeNull();
    expect(styleEl!.hasAttribute("nonce")).toBe(false);
  });

  it("does not set a nonce attribute when cspNonce is undefined", () => {
    const shadow = getOrCreateShadowRoot(host, undefined);
    const styleEl = shadow.querySelector("style");
    expect(styleEl!.hasAttribute("nonce")).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* injectStyles                                                        */
/* ------------------------------------------------------------------ */

describe("injectStyles", () => {
  let host: HTMLDivElement;
  let shadow: ShadowRoot;

  beforeEach(() => {
    host = createHost();
    shadow = host.attachShadow({ mode: "open" });
  });

  afterEach(() => {
    host.remove();
  });

  it("returns an HTMLStyleElement", () => {
    const result = injectStyles(shadow, "body{color:red}");
    expect(result).toBeInstanceOf(HTMLStyleElement);
  });

  it("sets the textContent of the style element to the provided CSS", () => {
    const css = ".test { display: none; }";
    const style = injectStyles(shadow, css);
    expect(style.textContent).toBe(css);
  });

  it("appends the style element to the shadow root", () => {
    injectStyles(shadow, "div{margin:0}");
    expect(shadow.childNodes.length).toBe(1);
    expect(shadow.childNodes[0]!.nodeName.toLowerCase()).toBe("style");
  });

  it("preserves insertion order when called multiple times", () => {
    injectStyles(shadow, "/* first */");
    injectStyles(shadow, "/* second */");
    const styles = shadow.querySelectorAll("style");
    expect(styles.length).toBe(2);
    expect(styles[0]!.textContent).toBe("/* first */");
    expect(styles[1]!.textContent).toBe("/* second */");
  });

  it("sets the nonce attribute when cspNonce is provided", () => {
    const style = injectStyles(shadow, "p{}", "my-nonce-value");
    expect(style.getAttribute("nonce")).toBe("my-nonce-value");
  });

  it("uses setAttribute with 'nonce' as the attribute name", () => {
    const style = injectStyles(shadow, "p{}", "n1");
    // Confirm attribute name is exactly "nonce", not something else
    expect(style.getAttributeNames()).toContain("nonce");
  });

  it("does not set a nonce attribute when cspNonce is omitted", () => {
    const style = injectStyles(shadow, "p{}");
    expect(style.hasAttribute("nonce")).toBe(false);
  });

  it("does not set a nonce attribute when cspNonce is an empty string", () => {
    const style = injectStyles(shadow, "p{}", "");
    // Empty string is falsy, so nonce should not be set
    expect(style.hasAttribute("nonce")).toBe(false);
  });

  it("creates a <style> element using document.createElement", () => {
    const spy = jest.spyOn(document, "createElement");
    injectStyles(shadow, "a{}");
    expect(spy).toHaveBeenCalledWith("style");
    spy.mockRestore();
  });

  it("handles an empty CSS string without error", () => {
    const style = injectStyles(shadow, "");
    expect(style.textContent).toBe("");
    expect(shadow.childNodes.length).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* getShadowRoot                                                       */
/* ------------------------------------------------------------------ */

describe("getShadowRoot", () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = createHost();
  });

  afterEach(() => {
    host.remove();
  });

  it("returns null for an element that has never had a shadow root created", () => {
    const result = getShadowRoot(host);
    expect(result).toBeNull();
  });

  it("returns null, not undefined, for an unknown host", () => {
    const result = getShadowRoot(host);
    expect(result).not.toBeUndefined();
    expect(result).toStrictEqual(null);
  });

  it("returns the shadow root after getOrCreateShadowRoot has been called", () => {
    const created = getOrCreateShadowRoot(host);
    const retrieved = getShadowRoot(host);
    expect(retrieved).toBe(created);
  });

  it("returns the correct shadow root when multiple hosts exist", () => {
    const hostB = createHost();
    const shadowA = getOrCreateShadowRoot(host);
    const shadowB = getOrCreateShadowRoot(hostB);
    expect(getShadowRoot(host)).toBe(shadowA);
    expect(getShadowRoot(hostB)).toBe(shadowB);
    expect(getShadowRoot(host)).not.toBe(shadowB);
    hostB.remove();
  });

  it("returns null for a different element that never had a shadow attached", () => {
    getOrCreateShadowRoot(host);
    const otherHost = createHost();
    expect(getShadowRoot(otherHost)).toBeNull();
    otherHost.remove();
  });
});
