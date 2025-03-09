import winston from "winston";
import config from "../config";

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

export const logger = winston.createLogger({
  level: config.server.nodeEnv === "production" ? "info" : "debug",
  format: combine(timestamp(), logFormat),
  defaultMeta: { service: "wallet-tracker" },
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp(), logFormat),
    }),
  ],
});

// Add file transports in production
if (config.server.nodeEnv === "production") {
  logger.add(
    new winston.transports.File({ filename: "error.log", level: "error" })
  );
  logger.add(new winston.transports.File({ filename: "combined.log" }));
}
