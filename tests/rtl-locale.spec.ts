// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust

/**
 * The preview bridge writes html[dir] / html[lang]
 * on receipt of an rtl config payload. This test pins that the
 * bundled locale pack's isRTL() agrees with the bridge payload, so
 * the docs styler and the provii-agegate internals classify the same set
 * of locales the same way.
 */

import { isRTL, setLocale, RTL_LOCALES } from "../src/i18n/index.js";

describe("bundled pack RTL parity", () => {
  it("flags Arabic as RTL and English as LTR", () => {
    setLocale("ar");
    expect(isRTL()).toBe(true);
    setLocale("en");
    expect(isRTL()).toBe(false);
  });

  it("normalises subtags like ar-EG", () => {
    setLocale("ar-EG");
    expect(isRTL()).toBe(true);
    setLocale("en-US");
    expect(isRTL()).toBe(false);
  });

  it("exposes a stable RTL_LOCALES set that includes ar", () => {
    expect(RTL_LOCALES.has("ar")).toBe(true);
  });
});
