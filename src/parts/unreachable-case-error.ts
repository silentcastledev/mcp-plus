export class UnreachableCaseError extends Error {
  constructor(value: never, message?: string) {
    super(message ? `Unreachable case: ${value}: ${message}` : `Unreachable case: ${value}`);
  }
}
