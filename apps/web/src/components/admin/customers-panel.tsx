import { staffRequest } from "@/lib/api/server";
import type { ApiCustomerProfile, Paginated } from "@/lib/api/types";
import {
  AdminEmpty,
  AdminPager,
  AdminPanel,
  AdminTable,
  Field,
  adminButton,
  adminInput,
  when,
} from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";

export async function CustomersPanel({
  q,
  city,
  page,
}: {
  q?: string;
  city?: string;
  page: number;
}) {
  const customers = await staffRequest<Paginated<ApiCustomerProfile>>("/customers", {
    query: { q, city, page, limit: 20 },
  });

  const query: Record<string, string | undefined> = { q, city, tab: "customers" };

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-2" method="get">
        <input type="hidden" name="tab" value="customers" />
        <Field label="Search" className="w-52">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Name, email or phone"
            className={adminInput}
          />
        </Field>
        <Field label="City" className="w-40">
          <input name="city" defaultValue={city ?? ""} className={adminInput} />
        </Field>
        <button className={adminButton} type="submit">
          Filter
        </button>
      </form>

      <AdminPanel title={`${customers.meta.total} customers`}>
        <AdminTable
          minWidth={1020}
          head={["Customer", "Contact", "City", "Licence", "Bookings", "Member since", "Status"]}
        >
          {customers.data.length === 0 && (
            <AdminEmpty colSpan={7}>No customers match these filters.</AdminEmpty>
          )}
          {customers.data.map((customer) => (
            <tr key={customer.id} className="align-top">
              <td className="px-5 py-4">
                <p className="font-semibold text-ink">{customer.fullName}</p>
                <p className="font-mono text-[10px] text-muted">{customer.userId.slice(0, 8)}</p>
              </td>
              <td className="px-5 py-4 text-[12px] text-ink-soft">
                {customer.email}
                <p className="text-[11px] text-muted">{customer.phone ?? "No phone"}</p>
              </td>
              <td className="px-5 py-4 text-ink-soft">{customer.city ?? "—"}</td>
              <td className="px-5 py-4 text-[12px] text-ink-soft">
                {customer.licenceNumber ?? "—"}
                <p className="mt-1">
                  {customer.licenceVerifiedAt ? (
                    <Badge variant="success" size="sm">
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="sm">
                      Unverified
                    </Badge>
                  )}
                </p>
              </td>
              <td className="px-5 py-4 font-semibold text-ink">{customer.totalBookings}</td>
              <td className="px-5 py-4 text-[12px] text-ink-soft">{when(customer.memberSince)}</td>
              <td className="px-5 py-4">
                <Badge variant={customer.status === "ACTIVE" ? "success" : "neutral"} size="sm">
                  {customer.status}
                </Badge>
              </td>
            </tr>
          ))}
        </AdminTable>
        <AdminPager
          page={customers.meta.page}
          totalPages={customers.meta.totalPages}
          path="/admin/users"
          params={query}
        />
      </AdminPanel>
    </div>
  );
}
