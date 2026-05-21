"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  GearIcon,
  GridIcon,
  GuideIcon,
  HomeIcon,
  SidebarWave,
  SparkleIcon,
  StackIcon,
  TemplateIcon,
} from "@/components/icons";

const navItems = [
  { label: "Home", icon: HomeIcon, href: "/" },
  { label: "Brands", icon: GridIcon, href: "/brands" },
  { label: "Assets", icon: StackIcon, href: "/brands" },
  { label: "Templates", icon: TemplateIcon, href: "/brands" },
  { label: "Guidelines", icon: GuideIcon, href: "/brands" },
  { label: "Settings", icon: GearIcon, href: "/brands" },
];

export function Sidebar({ activeHref = "/" }: { activeHref?: string }) {
  const { data: session } = useSession();
  const name = session?.user?.name ?? "Your account";
  const email = session?.user?.email ?? "";
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  return (
    <aside className="sidebar" aria-label="Fluid navigation">
      <Link className="logo" href="/" aria-label="Fluid home">
        <img src="/fluid-primary-wordmark.png" alt="Fluid." />
      </Link>
      <nav className="primary-nav" aria-label="Primary">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              className={item.href === activeHref ? "nav-item active" : "nav-item"}
              href={item.href}
              key={item.label}
            >
              <Icon />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <SidebarWave />

      <section className="upgrade-card" aria-label="Upgrade to Pro">
        <div className="upgrade-title">
          <SparkleIcon />
          <strong>Upgrade to Pro</strong>
        </div>
        <p>Unlock more brand kits, team members, and advanced exports.</p>
        <button type="button">
          Upgrade Now
          <ArrowRightIcon />
        </button>
      </section>

      <button
        className="profile-card"
        type="button"
        aria-label="Sign out"
        onClick={() => signOut({ callbackUrl: "/signin" })}
      >
        <span className="avatar">{initial}</span>
        <span className="profile-copy">
          <strong>{name}</strong>
          <em>{email}</em>
        </span>
        <ChevronDownIcon />
      </button>
    </aside>
  );
}
