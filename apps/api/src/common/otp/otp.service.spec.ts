import { OtpPurpose } from "@prisma/client";
import { OtpService } from "./otp.service";

interface Created {
  data: { userId: string; identifier: string; purpose: OtpPurpose; codeHash: string };
}

/**
 * The OTP switch is a test convenience with a production-shaped surface, so the
 * rule that keeps it shut is worth pinning down without a database: it may only
 * hand a live code to the caller when the environment says so twice over.
 */
describe("OtpService code exposure", () => {
  const build = (env: Record<string, string | undefined>) => {
    const created: Created[] = [];
    const sent: Array<{ to: string; text: string }> = [];
    const prisma = {
      verificationCode: {
        create: async ({ data }: Created) => {
          created.push({ data });
          return { id: "otp-1", ...data, attempts: 0 };
        },
      },
    };
    const config = { get: (key: string) => env[key] };
    const mail = { send: async (message: { to: string; text: string }) => void sent.push(message) };
    const service = new OtpService(
      prisma as never,
      config as never,
      mail as never,
    );

    return { service, created, sent };
  };

  it("keeps the code out of the response in production even with the switch on", async () => {
    const { service, created } = build({
      NODE_ENV: "production",
      AUTH_DEBUG_OTP: "true",
      OTP_SECRET: "test-otp-secret",
    });

    const issued = await service.issue("user-1", "rider@example.com", OtpPurpose.EMAIL_VERIFICATION);

    expect(issued.devCode).toBeUndefined();
    expect(created).toHaveLength(1);
  });

  it("keeps the code out of the response when the switch is off", async () => {
    const { service } = build({ NODE_ENV: "development", AUTH_DEBUG_OTP: undefined });

    const issued = await service.issue("user-1", "rider@example.com", OtpPurpose.EMAIL_VERIFICATION);

    expect(issued.devCode).toBeUndefined();
  });

  it("hands the code back to a development caller and still stores only a digest", async () => {
    const { service, created } = build({
      NODE_ENV: "development",
      AUTH_DEBUG_OTP: "true",
      OTP_SECRET: "test-otp-secret",
    });

    const issued = await service.issue("user-1", "rider@example.com", OtpPurpose.EMAIL_VERIFICATION);

    expect(issued.devCode).toMatch(/^\d{6}$/);
    // The row that lands in `verification_codes` never carries the code itself.
    expect(created[0].data.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(created[0].data.codeHash).not.toContain(issued.devCode);
  });

  it("refuses a code once it has been guessed at five times", async () => {
    const record = {
      id: "otp-1",
      identifier: "rider@example.com",
      purpose: OtpPurpose.EMAIL_VERIFICATION,
      userId: "user-1",
      codeHash: "a".repeat(64),
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 5,
      consumedAt: null,
    };
    const { service } = build({ NODE_ENV: "development", OTP_SECRET: "test-otp-secret" });
    const spent = new OtpService(
      { verificationCode: { findFirst: async () => record } } as never,
      { get: (key: string) => (key === "OTP_SECRET" ? "test-otp-secret" : undefined) } as never,
      { send: async () => undefined } as never,
    );

    // Even the right code is worthless once the attempt budget has run out.
    const issued = await service.issue("user-1", record.identifier, OtpPurpose.EMAIL_VERIFICATION);
    const failure = await spent
      .consume(record.identifier, OtpPurpose.EMAIL_VERIFICATION, issued.devCode!, record.userId)
      .then(() => null, (error) => error.getResponse());

    expect(failure).toMatchObject({ code: "INVALID_OTP" });
  });

  it("counts an attempt against a wrong code instead of leaving it open", async () => {
    const record = {
      id: "otp-1",
      identifier: "rider@example.com",
      purpose: OtpPurpose.EMAIL_VERIFICATION,
      userId: "user-1",
      codeHash: "b".repeat(64),
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 1,
      consumedAt: null,
    };
    const updates: Array<{ attempts?: { increment: number } }> = [];
    const service = new OtpService(
      {
        verificationCode: {
          findFirst: async () => record,
          update: async ({ data }: { data: { attempts?: { increment: number } } }) => {
            updates.push(data);
            return record;
          },
        },
      } as never,
      { get: (key: string) => (key === "OTP_SECRET" ? "test-otp-secret" : undefined) } as never,
      { send: async () => undefined } as never,
    );

    const failure = await service
      .consume(record.identifier, OtpPurpose.EMAIL_VERIFICATION, "000000", record.userId)
      .then(() => null, (error) => error.getResponse());

    expect(failure).toMatchObject({ code: "INVALID_OTP" });
    expect(updates).toEqual([{ attempts: { increment: 1 } }]);
    expect(record.consumedAt).toBeNull();
  });
});
