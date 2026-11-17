import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { staffRequest } from "@/lib/api/server";
import type {
  AdminCouponItem,
  ApiCategory,
  Paginated,
} from "@/lib/api/types";
import {
  AdminAction,
  AdminDrawer,
  AdminEmpty,
  AdminPage,
  AdminPager,
  AdminPanel,
  AdminTable,
  Field,
  adminButton,
  adminButtonDanger,
  adminInput,
  adminTextarea,
  firstParam,
  inr,
  when,
} from "@/components/admin/ui";
import { AdminActiveFlag } from "@/components/admin/status-badge";
import { createCoupon, deleteCoupon, updateCoupon } from "../actions";

export const metadata: Metadata = { title: "Coupons · Admin" };

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = firstParam(params.q);
  const active = firstParam(params.active);
  const page = Number(firstParam(params.page) ?? "1") || 1;

  const [coupons, categories] = await Promise.all([
    staffRequest<Paginated<AdminCouponItem>>("/coupons/manage", {
      query: { q, active, page, limit: 20 },
    }),
    staffRequest<ApiCategory[]>("/categories/manage"),
  ]);

  const query: Record<string, string | undefined> = { q, active };
  const search = new URLSearchParams(
    Object.entries(query).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  ).toString();
  const redirectTo = search ? `/admin/coupons?${search}` : "/admin/coupons";

  return (
    <AdminPage
      title="Coupons"
      description="Percentage or flat discounts, optionally limited to a category."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
      action={
        <form className="flex flex-wrap items-end gap-2" method="get">
          <Field label="Search" className="w-48">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Code or title"
              className={adminInput}
            />
          </Field>
          <Field label="State" className="w-36">
            <select name="active" defaultValue={active ?? ""} className={adminInput}>
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </Field>
          <button className={adminButton} type="submit">
            Filter
          </button>
        </form>
      }
    >
      <AdminPanel title="Create a coupon">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-[13px] font-semibold text-brand-700">
            <Plus className="size-4" /> New coupon form
          </summary>
          <form
            action={createCoupon}
            className="grid gap-4 border-t border-line px-5 py-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <Field label="Code">
              <input name="code" required className={adminInput} placeholder="SAVARI100" />
            </Field>
            <Field label="Title">
              <input name="title" required className={adminInput} placeholder="₹100 off" />
            </Field>
            <Field label="Type">
              <select name="type" className={adminInput} defaultValue="FLAT">
                <option value="FLAT">Flat ₹</option>
                <option value="PERCENT">Percent %</option>
              </select>
            </Field>
            <Field label="Value">
              <input
                name="value"
                type="number"
                min={0.01}
                step="0.01"
                required
                className={adminInput}
              />
            </Field>
            <Field label="Max discount (₹)">
              <input name="maxDiscount" type="number" min={0} step="0.01" className={adminInput} />
            </Field>
            <Field label="Min order (₹)">
              <input name="minOrderAmount" type="number" min={0} step="0.01" className={adminInput} />
            </Field>
            <Field label="Valid from">
              <input name="validFrom" type="date" className={adminInput} />
            </Field>
            <Field label="Valid till">
              <input name="validTill" type="date" required className={adminInput} />
            </Field>
            <Field label="Total uses">
              <input name="usageLimit" type="number" min={1} className={adminInput} placeholder="500" />
            </Field>
            <Field label="Uses per customer">
              <input
                name="perUserLimit"
                type="number"
                min={1}
                max={100}
                defaultValue={1}
                className={adminInput}
              />
            </Field>
            <Field label="State">
              <select name="isActive" className={adminInput} defaultValue="true">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </Field>
            <Field label="Category targeting" hint="Ctrl/⌘-click to select multiple">
              <select
                name="categoryIds"
                multiple
                size={3}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-brand-400"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Description" className="sm:col-span-2 lg:col-span-4">
              <textarea name="description" className={adminTextarea} />
            </Field>
            <div className="sm:col-span-2 lg:col-span-4">
              <button className={adminButton} type="submit">
                Create coupon
              </button>
            </div>
          </form>
        </details>
      </AdminPanel>

      <AdminPanel title={`${coupons.meta.total} coupons`}>
        <AdminTable
          minWidth={1060}
          head={["Coupon", "Discount", "Conditions", "Validity", "Usage", "State", "Actions"]}
        >
          {coupons.data.length === 0 && (
            <AdminEmpty colSpan={7}>No coupons match these filters.</AdminEmpty>
          )}
          {coupons.data.map((coupon) => (
            <tr key={coupon.id} className="align-top">
              <td className="px-5 py-4">
                <p className="font-mono text-[13px] font-bold text-ink">{coupon.code}</p>
                <p className="text-[11px] text-muted">{coupon.title}</p>
                {coupon.appliesTo.length > 0 && (
                  <p className="text-[11px] text-brand-700">
                    {coupon.appliesTo.map((category) => category.name).join(", ")}
                  </p>
                )}
              </td>
              <td className="px-5 py-4 font-semibold text-ink">
                {coupon.type === "PERCENT" ? `${coupon.value}%` : inr(coupon.value)}
                {coupon.maxDiscount ? (
                  <p className="text-[11px] font-normal text-muted">
                    Max {inr(coupon.maxDiscount)}
                  </p>
                ) : null}
              </td>
              <td className="px-5 py-4 text-[12px] text-ink-soft">
                Min order {inr(coupon.minOrderAmount)}
                <p className="text-[11px] text-muted">
                  {coupon.perUserLimit} per customer
                </p>
              </td>
              <td className="px-5 py-4 text-[12px] text-ink-soft">
                {when(coupon.validFrom ?? null)}
                <p className="text-[11px] text-muted">to {when(coupon.validTill)}</p>
              </td>
              <td className="px-5 py-4 text-[12px] text-ink-soft">
                {coupon.usedCount}
                {coupon.usageLimit ? ` / ${coupon.usageLimit}` : " used"}
              </td>
              <td className="px-5 py-4">
                <AdminActiveFlag active={coupon.isActive} />
              </td>
              <td className="px-5 py-4">
                <AdminAction>
                  <AdminDrawer label="Edit">
                    <form action={updateCoupon} className="grid grid-cols-2 gap-3">
                      <input type="hidden" name="id" value={coupon.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={coupon.isActive ? "true" : "false"}
                      />
                      <Field label="Title" className="col-span-2">
                        <input name="title" defaultValue={coupon.title} className={adminInput} />
                      </Field>
                      <Field label="Value">
                        <input
                          name="value"
                          type="number"
                          min={0.01}
                          step="0.01"
                          defaultValue={coupon.value}
                          className={adminInput}
                        />
                      </Field>
                      <Field label="Max discount (₹)">
                        <input
                          name="maxDiscount"
                          type="number"
                          min={0}
                          step="0.01"
                          defaultValue={coupon.maxDiscount ?? ""}
                          className={adminInput}
                        />
                      </Field>
                      <Field label="Min order (₹)">
                        <input
                          name="minOrderAmount"
                          type="number"
                          min={0}
                          step="0.01"
                          defaultValue={coupon.minOrderAmount}
                          className={adminInput}
                        />
                      </Field>
                      <Field label="Valid till">
                        <input
                          name="validTill"
                          type="date"
                          defaultValue={coupon.validTill.slice(0, 10)}
                          className={adminInput}
                        />
                      </Field>
                      <div className="col-span-2">
                        <button className={adminButton} type="submit">
                          Save coupon
                        </button>
                      </div>
                    </form>
                  </AdminDrawer>
                  {coupon.isActive && (
                    <form action={deleteCoupon}>
                      <input type="hidden" name="id" value={coupon.id} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <button className={adminButtonDanger} type="submit">
                        Deactivate
                      </button>
                    </form>
                  )}
                </AdminAction>
              </td>
            </tr>
          ))}
        </AdminTable>
        <AdminPager
          page={coupons.meta.page}
          totalPages={coupons.meta.totalPages}
          path="/admin/coupons"
          params={query}
        />
      </AdminPanel>
    </AdminPage>
  );
}
