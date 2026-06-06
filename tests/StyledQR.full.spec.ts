// Copyright (c) 2026 Maelstrom AI Pty Ltd ATF Maelstrom AI Holding Trust (ABN 61 633 823 792)
// SPDX-License-Identifier: MIT
/**
 * Full StyledQR.ts tests for 90%+ mutation coverage
 * Tests styled QR code wrapper class
 */

import { StyledQR } from "../src/ui/StyledQR.js";

// Mock QRCodeStyling (CJS module loaded via require in StyledQR.ts).
// We define the mock inside the factory to avoid the TDZ error that hits
// when jest hoists `jest.mock(...)` above the `const mockQRConstructor`
// declaration. The mock is then re-grabbed by importing the mocked module
// after `jest.mock` has registered its factory.
jest.mock("qr-code-styling", () => jest.fn());

// `require` (not `import`) so this evaluates after jest.mock has run, and the
// resulting binding is the jest.fn() the factory returns. Using `import` here
// would still work but TS+ESLint forbid mixing top-level imports with a hoist
// dependency on jest.mock. Using `require` makes the order explicit.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockQRConstructor: jest.Mock = require("qr-code-styling");

describe("StyledQR.ts - Full Coverage", () => {
  let mockContainer: HTMLElement;
  let mockQRInstance: {
    append: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock container element
    mockContainer = document.createElement("div");

    // Mock QRCodeStyling instance
    mockQRInstance = {
      append: jest.fn(),
      update: jest.fn(),
    };

    mockQRConstructor.mockImplementation(() => mockQRInstance);
  });

  describe("constructor", () => {
    it("creates QRCodeStyling with configuration", () => {
      new StyledQR(mockContainer, "test data");

      expect(mockQRConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 200,
          height: 200,
          type: "canvas",
          data: "test data",
        }),
      );
    });

    it("uses empty string as default initial data", () => {
      new StyledQR(mockContainer);

      expect(mockQRConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          data: "",
        }),
      );
    });

    it("configures dots with gradient", () => {
      new StyledQR(mockContainer);

      expect(mockQRConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          dotsOptions: expect.objectContaining({
            type: "dots",
            gradient: expect.objectContaining({
              type: "linear",
              rotation: 0,
              colorStops: [
                { offset: 0, color: "#0091C7" },
                { offset: 0.5, color: "#5B3DF5" },
                { offset: 1, color: "#C23AD6" },
              ],
            }),
          }),
        }),
      );
    });

    it("configures corners square with gradient", () => {
      new StyledQR(mockContainer);

      expect(mockQRConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          cornersSquareOptions: expect.objectContaining({
            type: "extra-rounded",
            gradient: expect.objectContaining({
              type: "linear",
              rotation: 180,
              colorStops: [
                { offset: 0, color: "#0091C7" },
                { offset: 1, color: "#5B3DF5" },
              ],
            }),
          }),
        }),
      );
    });

    it("configures corners dot options", () => {
      new StyledQR(mockContainer);

      expect(mockQRConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          cornersDotOptions: {
            type: "square",
            color: "#C23AD6",
          },
        }),
      );
    });

    it("configures background options", () => {
      new StyledQR(mockContainer);

      expect(mockQRConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          backgroundOptions: {
            color: "#ffffff",
          },
        }),
      );
    });

    it("configures QR options", () => {
      new StyledQR(mockContainer);

      expect(mockQRConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          qrOptions: {
            typeNumber: 0,
            mode: "Byte",
            errorCorrectionLevel: "Q",
          },
        }),
      );
    });

    it("appends QR code to container", () => {
      new StyledQR(mockContainer, "test");

      expect(mockQRInstance.append).toHaveBeenCalledWith(mockContainer);
    });

    it("stores container reference", () => {
      const qr = new StyledQR(mockContainer);

      // Test by calling destroy and verifying container is accessed
      qr.destroy();
      expect(mockContainer.innerHTML).toBe("");
    });
  });

  describe("update", () => {
    it("updates QR code with new data", () => {
      const qr = new StyledQR(mockContainer);
      qr.update("new data");

      expect(mockQRInstance.update).toHaveBeenCalledWith({ data: "new data" });
    });

    it("can be called multiple times", () => {
      const qr = new StyledQR(mockContainer);
      qr.update("data 1");
      qr.update("data 2");
      qr.update("data 3");

      expect(mockQRInstance.update).toHaveBeenCalledTimes(3);
      expect(mockQRInstance.update).toHaveBeenNthCalledWith(1, {
        data: "data 1",
      });
      expect(mockQRInstance.update).toHaveBeenNthCalledWith(2, {
        data: "data 2",
      });
      expect(mockQRInstance.update).toHaveBeenNthCalledWith(3, {
        data: "data 3",
      });
    });

    it("handles empty string", () => {
      const qr = new StyledQR(mockContainer);
      qr.update("");

      expect(mockQRInstance.update).toHaveBeenCalledWith({ data: "" });
    });

    it("handles long data", () => {
      const qr = new StyledQR(mockContainer);
      const longData = "x".repeat(1000);
      qr.update(longData);

      expect(mockQRInstance.update).toHaveBeenCalledWith({ data: longData });
    });

    it("handles unicode data", () => {
      const qr = new StyledQR(mockContainer);
      qr.update("你好世界🌍");

      expect(mockQRInstance.update).toHaveBeenCalledWith({
        data: "你好世界🌍",
      });
    });

    it("handles JSON data", () => {
      const qr = new StyledQR(mockContainer);
      const jsonData = JSON.stringify({ key: "value" });
      qr.update(jsonData);

      expect(mockQRInstance.update).toHaveBeenCalledWith({ data: jsonData });
    });
  });

  describe("destroy", () => {
    it("clears container innerHTML", () => {
      const qr = new StyledQR(mockContainer);
      mockContainer.innerHTML = "<canvas>test</canvas>";

      qr.destroy();

      expect(mockContainer.innerHTML).toBe("");
    });

    it("handles already empty container", () => {
      const qr = new StyledQR(mockContainer);
      mockContainer.innerHTML = "";

      qr.destroy();

      expect(mockContainer.innerHTML).toBe("");
    });

    it("can be called multiple times", () => {
      const qr = new StyledQR(mockContainer);
      mockContainer.innerHTML = "<canvas>test</canvas>";

      qr.destroy();
      qr.destroy();
      qr.destroy();

      expect(mockContainer.innerHTML).toBe("");
    });

    it("handles null container gracefully", () => {
      const qr = new StyledQR(mockContainer);
      // Manually set container to null to test the null check
      (qr as any).container = null;

      // Should not throw
      expect(() => qr.destroy()).not.toThrow();
    });
  });

  describe("integration scenarios", () => {
    it("supports full lifecycle: create -> update -> destroy", () => {
      const qr = new StyledQR(mockContainer, "initial");
      expect(mockQRInstance.append).toHaveBeenCalled();

      qr.update("updated");
      expect(mockQRInstance.update).toHaveBeenCalledWith({ data: "updated" });

      mockContainer.innerHTML = "<canvas></canvas>";
      qr.destroy();
      expect(mockContainer.innerHTML).toBe("");
    });

    it("can create multiple instances", () => {
      const container1 = document.createElement("div");
      const container2 = document.createElement("div");

      const qr1 = new StyledQR(container1, "data1");
      const qr2 = new StyledQR(container2, "data2");

      expect(mockQRConstructor).toHaveBeenCalledTimes(2);
      expect(mockQRInstance.append).toHaveBeenCalledWith(container1);
      expect(mockQRInstance.append).toHaveBeenCalledWith(container2);
    });

    it("instances are independent", () => {
      const container1 = document.createElement("div");
      const container2 = document.createElement("div");

      const qr1 = new StyledQR(container1);
      const qr2 = new StyledQR(container2);

      qr1.update("data1");
      qr2.update("data2");

      expect(mockQRInstance.update).toHaveBeenCalledWith({ data: "data1" });
      expect(mockQRInstance.update).toHaveBeenCalledWith({ data: "data2" });
    });

    it("handles rapid updates", () => {
      const qr = new StyledQR(mockContainer);

      for (let i = 0; i < 100; i++) {
        qr.update(`data-${i}`);
      }

      expect(mockQRInstance.update).toHaveBeenCalledTimes(100);
    });
  });

  describe("configuration values", () => {
    it("uses Provii accent gradient stops for dots", () => {
      new StyledQR(mockContainer);

      const call = mockQRConstructor.mock.calls[0][0];
      expect(call.dotsOptions.gradient.colorStops[0].color).toBe("#0091C7");
      expect(call.dotsOptions.gradient.colorStops[1].color).toBe("#5B3DF5");
      expect(call.dotsOptions.gradient.colorStops[2].color).toBe("#C23AD6");
    });

    it("uses correct gradient colors for corners square", () => {
      new StyledQR(mockContainer);

      const call = mockQRConstructor.mock.calls[0][0];
      expect(call.cornersSquareOptions.gradient.colorStops[0].color).toBe(
        "#0091C7",
      );
      expect(call.cornersSquareOptions.gradient.colorStops[1].color).toBe(
        "#5B3DF5",
      );
    });

    it("uses correct corner dot color", () => {
      new StyledQR(mockContainer);

      const call = mockQRConstructor.mock.calls[0][0];
      expect(call.cornersDotOptions.color).toBe("#C23AD6");
    });

    it("uses correct background color (white)", () => {
      new StyledQR(mockContainer);

      const call = mockQRConstructor.mock.calls[0][0];
      expect(call.backgroundOptions.color).toBe("#ffffff");
    });

    it("uses correct QR type number", () => {
      new StyledQR(mockContainer);

      const call = mockQRConstructor.mock.calls[0][0];
      expect(call.qrOptions.typeNumber).toBe(0);
    });

    it("uses Byte mode", () => {
      new StyledQR(mockContainer);

      const call = mockQRConstructor.mock.calls[0][0];
      expect(call.qrOptions.mode).toBe("Byte");
    });

    it("uses Q error correction level", () => {
      new StyledQR(mockContainer);

      const call = mockQRConstructor.mock.calls[0][0];
      expect(call.qrOptions.errorCorrectionLevel).toBe("Q");
    });

    it("uses canvas type for rendering", () => {
      new StyledQR(mockContainer);

      const call = mockQRConstructor.mock.calls[0][0];
      expect(call.type).toBe("canvas");
    });

    it("uses 200x200 dimensions", () => {
      new StyledQR(mockContainer);

      const call = mockQRConstructor.mock.calls[0][0];
      expect(call.width).toBe(200);
      expect(call.height).toBe(200);
    });
  });
});
