import { ZodError } from "zod";
import { AppError } from "../lib/http.js";

function extractMessage(error) {
  if (!(error instanceof ZodError)) {
    return "Girdi dogrulanamadi.";
  }

  return error.issues[0]?.message ?? "Girdi dogrulanamadi.";
}

function validate(schema, source) {
  return (req, _res, next) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (error) {
      next(new AppError(extractMessage(error), 400));
    }
  };
}

export const validateBody = (schema) => validate(schema, "body");
export const validateQuery = (schema) => validate(schema, "query");
export const validateParams = (schema) => validate(schema, "params");
