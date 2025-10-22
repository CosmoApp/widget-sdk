// Error class for native callbacks
export class CosmoError extends Error {
  constructor(type, code, message) {
    super(message || `${type}: ${code}`);
    this.type = type;
    this.code = code;
  }
}
