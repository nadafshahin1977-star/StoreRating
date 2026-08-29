import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  req.log?.error({ err: error }, "Unhandled request error");
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Please check the highlighted fields",
      errors: error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    });
  }
  return res.status(500).json({ success: false, message: "Something went wrong" });
};