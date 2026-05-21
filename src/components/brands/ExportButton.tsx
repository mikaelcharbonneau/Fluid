"use client";

import type { BrandView } from "./types";

export function ExportButton({ brand }: { brand: BrandView }) {
  const handleExport = () => {
    const payload = {
      name: brand.name,
      about: brand.about,
      audience: brand.audience,
      difference: brand.difference,
      competitors: brand.competitors,
      selectedName: brand.selectedName,
      selectedStyle: brand.selectedStyle,
      selectedLogo: brand.selectedLogo,
      strategy: brand.strategy,
      createdAt: brand.createdAt,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const slug = brand.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug || "brand"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button type="button" className="brand-action" onClick={handleExport}>
      Export JSON
    </button>
  );
}
