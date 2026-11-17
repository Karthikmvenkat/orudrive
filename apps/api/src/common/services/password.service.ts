import { Injectable } from "@nestjs/common";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

/**
 * Password hashing compatible with the `scrypt$salt$hash` format written by
 * `prisma/seed.ts`. scrypt is deliberately slow and memory-hard.
 */
@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const derived = await scryptAsync(password, salt, KEY_LENGTH);
    return `scrypt$${salt}$${derived.toString("hex")}`;
  }

  async verify(password: string, stored: string): Promise<boolean> {
    const [scheme, salt, hash] = stored.split("$");
    if (scheme !== "scrypt" || !salt || !hash) return false;

    const expected = Buffer.from(hash, "hex");
    if (expected.length !== KEY_LENGTH) return false;

    const derived = await scryptAsync(password, salt, KEY_LENGTH);
    return timingSafeEqual(expected, derived);
  }
}
