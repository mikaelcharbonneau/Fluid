import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listBrandsForUser } from "@/lib/db/brands";
import { Sidebar } from "@/components/wizard/Sidebar";
import { GradientRibbon } from "@/components/icons";
import { BrandList } from "@/components/brands/BrandList";
import { toBrandView } from "./serialize";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/brands");
  }

  const brands = await listBrandsForUser(session.user.id);

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
          <Link className="brand-action brand-action-primary brands-create" href="/">
            Create new brand
          </Link>
        </div>

        <BrandList initialBrands={brands.map(toBrandView)} />
      </section>
    </main>
  );
}
