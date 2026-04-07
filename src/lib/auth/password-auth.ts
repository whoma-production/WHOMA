import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual
} from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";

const scrypt = promisify(scryptCallback);
const PASSWORD_HASH_KEY_LENGTH = 64;
const PASSWORD_HASH_PREFIX = "scrypt";

export const authEmailSchema = z.string().trim().toLowerCase().email().max(320);
export const accountPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Use 128 characters or fewer.");
export const accountDisplayNameSchema = z
  .string()
  .trim()
  .min(2, "Enter your full name.")
  .max(120, "Use 120 characters or fewer.");

export const emailPasswordSignInSchema = z.object({
  email: authEmailSchema,
  password: accountPasswordSchema
});

export const emailPasswordRegisterSchema = emailPasswordSignInSchema.extend({
  name: accountDisplayNameSchema
});

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(
    password,
    salt,
    PASSWORD_HASH_KEY_LENGTH
  )) as Buffer;

  return `${PASSWORD_HASH_PREFIX}$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [algorithm, salt, expectedHash] = storedHash.split("$");

  if (
    algorithm !== PASSWORD_HASH_PREFIX ||
    !salt ||
    !expectedHash ||
    expectedHash.length === 0
  ) {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const actualBuffer = (await scrypt(
    password,
    salt,
    expectedBuffer.length
  )) as Buffer;

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}
