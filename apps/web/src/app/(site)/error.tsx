"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page flex min-h-[60vh] items-center py-16">
      <div className="mx-auto max-w-lg text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <TriangleAlert className="size-6" />
        </span>
        <h1 className="mt-5 text-[26px] font-extrabold tracking-[-0.02em] text-ink">
          Something took a wrong turn
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
          We couldn&apos;t load this page. It&apos;s usually a temporary connection issue — try
          again, or head back home while we check.
        </p>
        {error.digest && (
          <p className="mt-3 text-[11px] text-muted">
            Reference: <span className="font-mono">{error.digest}</span>
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Button size="lg" onClick={reset}>
            <RefreshCw className="size-4" /> Try again
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">Go home</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/contact">Contact support</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
