import { randomBytes } from "node:crypto";

export function createQrSlug(): string {
  return randomBytes(9).toString("base64url");
}
