import type { Metadata } from "next";
import { staffRequest } from "@/lib/api/server";
import type { AdminRoleItem, AdminSettingItem } from "@/lib/api/types";
import {
  AdminAction,
  AdminDrawer,
  AdminEmpty,
  AdminPage,
  AdminPanel,
  AdminTable,
  Field,
  adminButton,
  adminInput,
  firstParam,
  whenTime,
} from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { updateSetting } from "../actions";

export const metadata: Metadata = { title: "Settings · Admin" };

function displayValue(value: unknown) {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [settings, roles] = await Promise.all([
    staffRequest<AdminSettingItem[]>("/admin/settings"),
    staffRequest<AdminRoleItem[]>("/admin/roles"),
  ]);

  return (
    <AdminPage
      title="Settings"
      description="Runtime values used by bookings, refunds and support. Stored as JSON."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
    >
      <AdminPanel
        title="Runtime settings"
        description="Changes take effect immediately and are logged in the audit trail."
      >
        <AdminTable
          minWidth={860}
          head={["Key", "Value", "Description", "Last update", "Actions"]}
        >
          {settings.length === 0 && (
            <AdminEmpty colSpan={5}>No settings have been created yet.</AdminEmpty>
          )}
          {settings.map((setting) => (
            <tr key={setting.key} className="align-top">
              <td className="px-5 py-4">
                <p className="font-mono text-[12px] font-bold text-ink">{setting.key}</p>
              </td>
              <td className="px-5 py-4">
                <code className="rounded-md bg-page px-2 py-1 text-[12px] text-ink-soft">
                  {displayValue(setting.value)}
                </code>
              </td>
              <td className="px-5 py-4 text-[12px] text-muted">
                {setting.description ?? "—"}
              </td>
              <td className="px-5 py-4 text-[11px] text-muted">
                {setting.updatedBy ?? "—"}
                <p>{whenTime(setting.updatedAt)}</p>
              </td>
              <td className="px-5 py-4">
                <AdminDrawer label="Edit">
                  <form action={updateSetting} className="space-y-3">
                    <input type="hidden" name="key" value={setting.key} />
                    <input type="hidden" name="redirectTo" value="/admin/settings" />
                    <Field label="Value" hint="Numbers, true/false and JSON objects are parsed.">
                      <input
                        name="value"
                        defaultValue={displayValue(setting.value)}
                        className={adminInput}
                      />
                    </Field>
                    <Field label="Description">
                      <input
                        name="description"
                        defaultValue={setting.description ?? ""}
                        className={adminInput}
                      />
                    </Field>
                    <button className={adminButton} type="submit">
                      Save setting
                    </button>
                  </form>
                </AdminDrawer>
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminPanel>

      <AdminPanel title="Roles & permissions" description="Read-only overview">
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {roles.map((role) => (
            <div key={role.id} className="rounded-xl border border-line bg-page/40 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-bold text-ink">{role.name}</h3>
                <Badge variant="neutral" size="sm">
                  {role.users} user{role.users === 1 ? "" : "s"}
                </Badge>
              </div>
              <p className="mt-1 text-[11px] text-muted">
                {role.description ?? "No description"}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {role.permissions.map((permission) => (
                  <span
                    key={permission.id}
                    className="rounded-full border border-line bg-surface px-2 py-1 font-mono text-[10px] text-ink-soft"
                  >
                    {permission.key}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
