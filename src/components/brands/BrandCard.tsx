"use client";

import { useState } from "react";
import Link from "next/link";
import { ExportButton } from "./ExportButton";
import type { BrandView } from "./types";

export function BrandCard({
  brand,
  onDeleted,
}: {
  brand: BrandView;
  onDeleted: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/brands/${brand.id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Could not delete this brand.");
      }
      onDeleted(brand.id);
    } catch (err) {
      setDeleting(false);
      setError(err instanceof Error ? err.message : "Could not delete this brand.");
    }
  };

  return (
    <article className="brand-card">
      <header className="brand-card-head">
        <h2>{brand.selectedName || brand.name}</h2>
        <span className="brand-card-style">{brand.selectedStyle ?? "modern"}</span>
      </header>
      <p className="brand-card-tagline">{brand.strategy.tagline}</p>
      <p className="brand-card-meta">For {brand.audience}</p>

      {error && (
        <p className="brand-card-error" role="alert">
          {error}
        </p>
      )}

      <footer className="brand-card-actions">
        <Link className="brand-action brand-action-primary" href={`/brands/${brand.id}`}>
          View
        </Link>
        <ExportButton brand={brand} />
        <button
          type="button"
          className="brand-action brand-action-danger"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </footer>
    </article>
  );
}
