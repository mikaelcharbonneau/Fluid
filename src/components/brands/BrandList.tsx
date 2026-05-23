"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandCard } from "./BrandCard";
import type { BrandView } from "./types";

export function BrandList({ initialBrands }: { initialBrands: BrandView[] }) {
  const [brands, setBrands] = useState(initialBrands);

  const handleDeleted = (id: string) => {
    setBrands((items) => items.filter((brand) => brand.id !== id));
  };

  if (brands.length === 0) {
    return (
      <div className="brands-empty">
        <h2>No brands yet</h2>
        <p>Create your first AI-guided brand identity to see it saved here.</p>
        <Link className="brand-action brand-action-primary" href="/brands/create">
          Create a brand
        </Link>
      </div>
    );
  }

  return (
    <div className="brands-grid">
      {brands.map((brand) => (
        <BrandCard key={brand.id} brand={brand} onDeleted={handleDeleted} />
      ))}
    </div>
  );
}
