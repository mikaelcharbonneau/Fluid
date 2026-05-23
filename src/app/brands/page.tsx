import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listBrandsForUser } from "@/lib/db/brands";
import { Sidebar } from "@/components/wizard/Sidebar";
import { GradientRibbon } from "@/components/icons";
import { BrandList } from "@/components/brands/BrandList";
import { toBrandView } from "./serialize";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/signin?redirectTo=/brands");
  }

  const brands = await listBrandsForUser(supabase, user.id);

  return (
    <main className="app-frame" aria-label="Saved brands">
      <Sidebar activeHref="/brands" />
      <section className="workspace-shell">
        <GradientRibbon variant="top" />
        <GradientRibbon variant="bottom" />

        <div className="screen-heading">
          <div className="breadcrumb">
            <span>Brands</span>
          </div>
          <h1>Your brands</h1>
          <p>Every brand identity you create with Fluid is saved here.</p>
          <Link className="brand-action brand-action-primary brands-create" href="/brands/create">
            Create new brand
          </Link>
        </div>

        <BrandList initialBrands={brands.map(toBrandView)} />
      </section>
    </main>
  );
}
