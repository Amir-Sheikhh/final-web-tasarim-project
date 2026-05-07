function serializeError(error) {
  return {
    name: error?.name ?? "Error",
    message: error?.message ?? "Unknown error",
    stack: process.env.NODE_ENV === "production" ? undefined : error?.stack
  };
}

export function logInfo(message, meta = {}) {
  console.log(
    JSON.stringify({
      level: "info",
      time: new Date().toISOString(),
      message,
      ...meta
    })
  );
}

export function logWarn(message, meta = {}) {
  console.warn(
    JSON.stringify({
      level: "warn",
      time: new Date().toISOString(),
      message,
      ...meta
    })
  );
}

export function logError(message, error, meta = {}) {
  console.error(
    JSON.stringify({
      level: "error",
      time: new Date().toISOString(),
      message,
      error: serializeError(error),
      ...meta
    })
  );
}
