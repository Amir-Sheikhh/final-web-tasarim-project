export class AppError extends Error {
  constructor(message, status = 400, details = undefined) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.details = details;
  }
}

export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
