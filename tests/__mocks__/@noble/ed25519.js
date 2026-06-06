// Mock for @noble/ed25519 to avoid ES module parsing issues in Jest

module.exports = {
  verify: jest.fn().mockReturnValue(true),
  getPublicKey: jest.fn().mockReturnValue(new Uint8Array(32)),
  sign: jest.fn().mockReturnValue(new Uint8Array(64)),
  getPublicKeyAsync: jest.fn().mockResolvedValue(new Uint8Array(32)),
  signAsync: jest.fn().mockResolvedValue(new Uint8Array(64)),
  verifyAsync: jest.fn().mockResolvedValue(true),
};