import type { Metadata } from "next";
import { staffRequest } from "@/lib/api/server";
import type { AdminReviewItem, Paginated } from "@/lib/api/types";
import {
  AdminAction,
  AdminEmpty,
  AdminPage,
  AdminPager,
  AdminPanel,
  AdminTable,
  Field,
  adminButton,
  adminButtonDanger,
  adminInput,
  firstParam,
  when,
} from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { moderateReview, deleteReview } from "../actions";

export const metadata: Metadata = { title: "Reviews · Admin" };

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-[12px] text-amber-500" aria-label={`${rating} out of 5`}>
      {"★".repeat(rating)}
      <span className="text-line-strong">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = firstParam(params.q);
  const published = firstParam(params.published);
  const page = Number(firstParam(params.page) ?? "1") || 1;

  const reviews = await staffRequest<Paginated<AdminReviewItem>>("/reviews/manage", {
    query: { q, published, page, limit: 20 },
  });

  const query: Record<string, string | undefined> = { q, published };
  const search = new URLSearchParams(
    Object.entries(query).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  ).toString();
  const redirectTo = search ? `/admin/reviews?${search}` : "/admin/reviews";

  return (
    <AdminPage
      title="Reviews"
      description="Publish, hide or remove customer reviews. Ratings recalculate automatically."
      notice={firstParam(params.notice)}
      error={firstParam(params.error)}
      action={
        <form className="flex flex-wrap items-end gap-2" method="get">
          <Field label="Search" className="w-48">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Comment or booking code"
              className={adminInput}
            />
          </Field>
          <Field label="State" className="w-36">
            <select name="published" defaultValue={published ?? ""} className={adminInput}>
              <option value="">All</option>
              <option value="true">Published</option>
              <option value="false">Hidden</option>
            </select>
          </Field>
          <button className={adminButton} type="submit">
            Filter
          </button>
        </form>
      }
    >
      <AdminPanel title={`${reviews.meta.total} reviews`}>
        <AdminTable
          minWidth={1040}
          head={["Review", "Vehicle", "Customer", "Rating", "State", "Created", "Actions"]}
        >
          {reviews.data.length === 0 && (
            <AdminEmpty colSpan={7}>No reviews match these filters.</AdminEmpty>
          )}
          {reviews.data.map((review) => (
            <tr key={review.id} className="align-top">
              <td className="max-w-[340px] px-5 py-4">
                <p className="font-semibold text-ink">{review.title ?? "Untitled"}</p>
                <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-muted">
                  {review.comment}
                </p>
                <p className="mt-1 font-mono text-[10px] text-muted">
                  {review.bookingCode}
                </p>
              </td>
              <td className="px-5 py-4 text-[12px] text-ink-soft">
                {review.vehicle.name}
                <p className="text-[11px] text-muted">/{review.vehicle.slug}</p>
              </td>
              <td className="px-5 py-4 text-[12px] text-ink-soft">
                {review.customerName}
              </td>
              <td className="px-5 py-4">
                <Stars rating={review.rating} />
              </td>
              <td className="px-5 py-4">
                <Badge variant={review.isPublished ? "success" : "neutral"} size="sm">
                  {review.isPublished ? "Published" : "Hidden"}
                </Badge>
              </td>
              <td className="px-5 py-4 text-[12px] text-ink-soft">
                {when(review.createdAt)}
              </td>
              <td className="px-5 py-4">
                <AdminAction>
                  <form action={moderateReview}>
                    <input type="hidden" name="id" value={review.id} />
                    <input type="hidden" name="redirectTo" value={redirectTo} />
                    <input
                      type="hidden"
                      name="published"
                      value={review.isPublished ? "false" : "true"}
                    />
                    <button className="text-[12px] font-semibold text-brand-700 hover:underline">
                      {review.isPublished ? "Hide" : "Publish"}
                    </button>
                  </form>
                  <form action={deleteReview}>
                    <input type="hidden" name="id" value={review.id} />
                    <input type="hidden" name="redirectTo" value={redirectTo} />
                    <button className={adminButtonDanger} type="submit">
                      Delete
                    </button>
                  </form>
                </AdminAction>
              </td>
            </tr>
          ))}
        </AdminTable>
        <AdminPager
          page={reviews.meta.page}
          totalPages={reviews.meta.totalPages}
          path="/admin/reviews"
          params={query}
        />
      </AdminPanel>
    </AdminPage>
  );
}
