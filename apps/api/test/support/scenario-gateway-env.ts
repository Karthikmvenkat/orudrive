/**
 * Razorpay credentials for the payment scenario suite.
 *
 * Import this module *before* the scenario harness: `@nestjs/config` snapshots
 * `process.env` when `ConfigModule.forRoot()` runs inside AppModule's
 * `@Module` decorator, so variables assigned after the import are never seen
 * by `ConfigService`.
 */
export const GATEWAY_KEY_ID = "rzp_test_scenario_key_id";
export const GATEWAY_KEY_SECRET = "scenario_key_secret_0123456789";
export const GATEWAY_WEBHOOK_SECRET = "scenario_webhook_secret_0123456789";

const GATEWAY_VARS = [
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
] as const;

const saved = GATEWAY_VARS.map((name) => [name, process.env[name]] as const);

process.env.RAZORPAY_KEY_ID = GATEWAY_KEY_ID;
process.env.RAZORPAY_KEY_SECRET = GATEWAY_KEY_SECRET;
process.env.RAZORPAY_WEBHOOK_SECRET = GATEWAY_WEBHOOK_SECRET;

/** Puts the environment back so later suites stay unconfigured. */
export function restoreGatewayEnv(): void {
  for (const [name, value] of saved) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}
