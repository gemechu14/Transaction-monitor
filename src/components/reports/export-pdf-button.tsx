"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Downloads a PDF built by `build`. The renderer and the report document are
 * imported inside `build`, so neither ships with the page bundle.
 */
export function ExportPdfButton({
  build,
  fileName,
  disabled,
  className,
}: {
  build: () => Promise<React.ReactElement>;
  fileName: string;
  disabled?: boolean;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleClick() {
    setBusy(true);
    setFailed(false);
    try {
      const [{ pdf }, element] = await Promise.all([import("@react-pdf/renderer"), build()]);
      // @react-pdf types `pdf()` against its own Document element; ours renders one.
      const blob = await pdf(element as Parameters<typeof pdf>[0]).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("PDF export failed", error);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || busy}
      title={failed ? "Export failed, try again" : undefined}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-60",
        failed && "border-destructive text-destructive",
        className,
      )}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin text-primary-strong" />
      ) : (
        <FileDown className="size-4 text-primary-strong" />
      )}
      {busy ? "Preparing…" : failed ? "Retry PDF" : "Export PDF"}
    </button>
  );
}

/** Logo for the PDF masthead; react-pdf fetches it, so it needs an absolute URL. */
export function reportLogoSrc(): string {
  return `${window.location.origin}/wso2-mark.png`;
}

export function reportAuthor(user: { displayName: string | null; username: string | null; email: string } | undefined) {
  return user?.displayName || user?.username || user?.email || "Transaction Ops user";
}
