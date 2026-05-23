"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
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
  { label: "Home", icon: HomeIcon, href: null, disabled: true },
  { label: "Brands", icon: GridIcon, href: "/brands" },
  { label: "Assets", icon: StackIcon, href: "/brands" },
  { label: "Templates", icon: TemplateIcon, href: "/brands" },
  { label: "Guidelines", icon: GuideIcon, href: "/brands" },
  { label: "Settings", icon: GearIcon, href: "/brands" },
];

export function Sidebar({ activeHref = "/" }: { activeHref?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("Your account");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      const displayName =
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        user.email ??
        "Your account";
      setName(displayName);
      setEmail(user.email ?? "");
    });
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [profileMenuOpen]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/signin");
  };

  const initial = (name || "?").trim().charAt(0).toUpperCase();

  return (
    <aside className="sidebar" aria-label="Fluid navigation">
      <Link className="logo" href="/brands" aria-label="Fluid brands">
        <img src="/fluid-primary-wordmark.png" alt="Fluid." />
      </Link>
      <nav className="primary-nav" aria-label="Primary">
        {navItems.map((item) => {
          const Icon = item.icon;
          if (item.disabled || !item.href) {
            return (
              <button className="nav-item disabled" type="button" disabled key={item.label}>
                <Icon />
                <span>{item.label}</span>
              </button>
            );
          }

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

      <div className="profile-menu-wrap" ref={profileMenuRef}>
        {profileMenuOpen && (
          <div className="profile-menu" id="profile-menu" role="menu">
            <div className="profile-menu-head">
              <strong>{name}</strong>
              <span>{email}</span>
            </div>
            <button type="button" role="menuitem" disabled>
              Profile settings
            </button>
            <button type="button" role="menuitem" disabled>
              Billing
            </button>
            <button type="button" role="menuitem" className="danger" onClick={signOut}>
              Log out
            </button>
          </div>
        )}

        <button
          className="profile-card"
          type="button"
          aria-label="Open profile menu"
          aria-expanded={profileMenuOpen}
          aria-controls="profile-menu"
          onClick={() => setProfileMenuOpen((open) => !open)}
        >
          <span className="avatar">{initial}</span>
          <span className="profile-copy">
            <strong>{name}</strong>
            <em>{email}</em>
          </span>
          <ChevronDownIcon />
        </button>
      </div>
    </aside>
  );
}
