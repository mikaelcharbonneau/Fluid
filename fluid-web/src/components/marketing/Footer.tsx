import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div className="row">
        <Image className="fl-wordmark" src="/assets/uuid/69452e02-b4ea-435d-8b03-dbf9854c7dce.png" alt="Fluid" width={700} height={184} />
        <nav style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
          <a href="#transform">How it works</a>
          <a href="#pricing">Pricing</a>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/signup">Start</Link>
        </nav>
      </div>
    </footer>
  );
}
