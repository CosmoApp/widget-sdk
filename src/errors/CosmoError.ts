export class CosmoError extends Error {
  type: string;
  code: string;

  constructor(type: string, code: string, message?: string) {
    super(message || `${type}: ${code}`);
    this.type = type;
    this.code = code;
  }
}