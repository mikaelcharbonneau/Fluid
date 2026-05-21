import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBrandById } from "@/lib/db/brands";
import { Sidebar } from "@/components/wizard/Sidebar";
import { GradientRibbon } from "@/components/icons";
import { ExportButton } from "@/components/brands/ExportButton";
import { toBrandView } from "../serialize";

export const dynamic = "force-dynamic";

export default async function BrandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/signin");
  }

  const { id } = await params;
  const brand = await getBrandById(supabase, user.id, id);
  if (!brand) {
    notFound();
  }

  const view = toBrandView(brand);
  const { strategy } = view;

  return (
    <main className="app-frame" aria-label={`Brand: ${view.name}`}>
      <Sidebar activeHref="/brands" />
      <section className="workspace-shell">
        <GradientRibbon variant="top" />
        <GradientRibbon variant="bottom" />

        <div className="screen-heading">
          <div className="breadcrumb">
            <Link href="/brands">Brands</Link>
            <span className="slash">/</span>
            <span>{view.selectedName || view.name}</span>
          </div>
          <h1>{view.selectedName || view.name}</h1>
          <p>{strategy.tagline}</p>
          <ExportButton brand={view} />
        </div>

        <div className="brand-detail">
          <section className="brand-detail-block">
            <h2>Positioning</h2>
            <p>{strategy.positioning}</p>
          </section>
          <section className="brand-detail-block">
            <h2>Audience insight</h2>
            <p>{strategy.audienceInsight}</p>
          </section>
          <section className="brand-detail-block">
            <h2>Visual direction</h2>
            <p>{strategy.visualDirection}</p>
            <p className="brand-detail-meta">Recommended style: {strategy.recommendedStyle}</p>
          </section>
          <section className="brand-detail-block">
            <h2>Personality</h2>
            <ul className="brand-chip-row">
              {strategy.personality.map((trait) => (
                <li key={trait}>{trait}</li>
              ))}
            </ul>
          </section>
          <section className="brand-detail-block">
            <h2>Suggested names</h2>
            <ul className="brand-chip-row">
              {strategy.suggestedNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </section>
          <section className="brand-detail-block">
            <h2>Naming territories</h2>
            <ul className="brand-chip-row">
              {strategy.namingTerritories.map((territory) => (
                <li key={territory}>{territory}</li>
              ))}
            </ul>
          </section>
        </div>
      </section>
    </main>
  );
}
