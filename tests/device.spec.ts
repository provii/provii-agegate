import { isMobile } from "../src/utils/device.js";

describe("device helpers", () => {
  let backupUA: string;

  beforeEach(() => {
    // snapshot the current globals *before* each individual test
    backupUA = navigator.userAgent;
  });

  afterEach(() => {
    // restore them so tests stay hermetic
    Object.defineProperty(navigator, "userAgent", {
      value: backupUA,
      configurable: true,
    });
  });

  /* --- isMobile ------------------------------------------------------- */

  it("detects iPhone user-agent", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS)",
      configurable: true,
    });
    expect(isMobile()).toBe(true);
  });

  it("returns false for a desktop user-agent", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
      configurable: true,
    });
    expect(isMobile()).toBe(false);
  });
});
