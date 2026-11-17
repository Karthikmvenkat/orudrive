import { PasswordService } from "./password.service";

describe("PasswordService", () => {
  const service = new PasswordService();

  it("hashes with the scrypt$salt$hash format", async () => {
    const hash = await service.hash("SavariGo@2026");
    expect(hash).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(hash).not.toContain("SavariGo@2026");
  });

  it("verifies the correct password", async () => {
    const hash = await service.hash("correct horse battery staple");
    await expect(service.verify("correct horse battery staple", hash)).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await service.hash("correct horse battery staple");
    await expect(service.verify("wrong password", hash)).resolves.toBe(false);
  });

  it("uses a fresh salt for every hash", async () => {
    const [first, second] = await Promise.all([
      service.hash("same-password"),
      service.hash("same-password"),
    ]);
    expect(first).not.toEqual(second);
  });

  it("rejects malformed stored hashes", async () => {
    await expect(service.verify("anything", "bcrypt$abc$def")).resolves.toBe(false);
    await expect(service.verify("anything", "scrypt$abc")).resolves.toBe(false);
    await expect(service.verify("anything", "")).resolves.toBe(false);
  });
});
