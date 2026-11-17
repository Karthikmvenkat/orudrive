import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { staffRequest } from "@/lib/api/server";
import type { ApiCategory } from "@/lib/api/types";
import {
  AdminAction,
  AdminDrawer,
  AdminEmpty,
  AdminPage,
  AdminPanel,
  AdminTable,
  Field,
  adminButton,
  adminButtonDanger,
  adminInput,
  adminTextarea,
  firstParam,
  inr,
} from "@/components/admin/ui";
import { AdminActiveFlag } from "@/components/admin/status-badge";
import {
  createCategory,
  deleteCategory,
  setCategoryActive,
} from "../actions";

export const metadata: Metadata = { title: "Categories · Admin" };

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const categories = await staffRequest<ApiCategory[]>("/categories/manage");
  const redirectTo = "/admin/categories";

  return (
    <AdminPage
      title="Categories"
      description="The categories shown across browse, filters and the home page."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
    >
      <AdminPanel title="Add a category" description="Slug is generated automatically.">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-[13px] font-semibold text-brand-700">
            <Plus className="size-4" /> New category form
          </summary>
          <form
            action={createCategory}
            className="grid gap-4 border-t border-line px-5 py-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <Field label="Name">
              <input name="name" required className={adminInput} placeholder="Electric bikes" />
            </Field>
            <Field label="Tagline">
              <input name="tagline" className={adminInput} placeholder="Quiet city rides" />
            </Field>
            <Field label="Sort order">
              <input
                name="sortOrder"
                type="number"
                min={0}
                defaultValue={categories.length + 1}
                className={adminInput}
              />
            </Field>
            <Field label="Image URL">
              <input
                name="imageUrl"
                className={adminInput}
                placeholder="/images/categories/e-bike.jpg"
              />
            </Field>
            <Field label="Active">
              <select name="isActive" className={adminInput} defaultValue="true">
                <option value="true">Active</option>
                <option value="false">Hidden</option>
              </select>
            </Field>
            <Field label="Description" className="sm:col-span-2 lg:col-span-3">
              <textarea name="description" className={adminTextarea} />
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <button className={adminButton} type="submit">
                Create category
              </button>
            </div>
          </form>
        </details>
      </AdminPanel>

      <AdminPanel title={`${categories.length} categories`}>
        <AdminTable
          minWidth={880}
          head={["Category", "Slug", "Vehicles", "From", "State", "Actions"]}
        >
          {categories.length === 0 && (
            <AdminEmpty colSpan={6}>No categories yet.</AdminEmpty>
          )}
          {categories.map((category) => (
            <tr key={category.id} className="align-top">
              <td className="px-5 py-4">
                <p className="font-semibold text-ink">{category.name}</p>
                <p className="text-[11px] text-muted">{category.tagline}</p>
              </td>
              <td className="px-5 py-4 font-mono text-[12px] text-ink-soft">
                {category.slug}
              </td>
              <td className="px-5 py-4 text-ink-soft">{category.vehicleCount}</td>
              <td className="px-5 py-4 text-ink-soft">
                {category.fromPrice ? inr(category.fromPrice) : "—"}
              </td>
              <td className="px-5 py-4">
                <AdminActiveFlag active={category.isActive} />
              </td>
              <td className="px-5 py-4">
                <AdminAction>
                  <form action={setCategoryActive}>
                    <input type="hidden" name="id" value={category.id} />
                    <input type="hidden" name="redirectTo" value={redirectTo} />
                    <input
                      type="hidden"
                      name="active"
                      value={category.isActive ? "false" : "true"}
                    />
                    <button className="text-[12px] font-semibold text-brand-700 hover:underline">
                      {category.isActive ? "Hide" : "Publish"}
                    </button>
                  </form>
                  {category.vehicleCount === 0 && (
                    <AdminDrawer label="Delete">
                      <form action={deleteCategory} className="space-y-3">
                        <input type="hidden" name="id" value={category.id} />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <p className="text-[12px] text-muted">
                          Only empty categories can be deleted.
                        </p>
                        <button className={adminButtonDanger} type="submit">
                          Delete {category.name}
                        </button>
                      </form>
                    </AdminDrawer>
                  )}
                </AdminAction>
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminPanel>
    </AdminPage>
  );
}
