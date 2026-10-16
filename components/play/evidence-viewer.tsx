"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EvidenceViewer({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((t) => !cancelled && setText(t))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [url]);

  const name = url.split("/").pop() ?? url;
  const isCsv = name.toLowerCase().endsWith(".csv");

  return (
    <div className="rounded-md border bg-background">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4 text-muted-foreground" />
          {name}
        </span>
        <Button asChild variant="ghost" size="sm">
          <a href={url} target="_blank" rel="noreferrer">
            Open <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      </div>
      <div className="max-h-80 overflow-auto">
        {error && <p className="p-3 text-sm text-destructive">Could not load evidence: {error}</p>}
        {text === null && !error && <p className="p-3 text-sm text-muted-foreground">Loading evidence...</p>}
        {text !== null && isCsv ? <CsvTable text={text} /> : text !== null ? (
          <pre className="p-3 text-xs leading-relaxed font-mono whitespace-pre">{text}</pre>
        ) : null}
      </div>
    </div>
  );
}

function CsvTable({ text }: { text: string }) {
  const rows = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.split(","));
  const [head, ...body] = rows;
  return (
    <table className="w-full text-xs font-mono">
      <thead className="sticky top-0 bg-card">
        <tr>
          {head.map((h, i) => (
            <th key={i} className="px-2 py-1 text-left font-semibold whitespace-nowrap border-b">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {body.map((r, i) => (
          <tr key={i} className="odd:bg-muted/30">
            {r.map((c, j) => (
              <td key={j} className="px-2 py-1 whitespace-nowrap">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
