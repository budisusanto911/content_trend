"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Bot,
  Compass,
  Flame,
  LayoutDashboard,
  Library,
  Lightbulb,
  Scissors,
  Settings,
  TrendingUp,
  Users,
  Menu,
  X,
  LogOut,
  UserCheck,
} from "lucide-react";
import { ManualScrapeButton } from "@/app/dashboard/ManualScrapeButton";
import type { SessionUser } from "@/lib/authStore";

interface NavLinkItem {
  href: string;
  label: string;
  icon: any;
  exact?: boolean;
}

interface NavSectionItem {
  section: string;
}

type NavEntry = NavLinkItem | NavSectionItem;

const NAV_ITEMS: NavEntry[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { section: "Research" },
  { href: "/dashboard/trending", label: "Trending", icon: Flame },
  { href: "/dashboard/rising", label: "Rising", icon: TrendingUp },
  { href: "/dashboard/niche-finder", label: "Niche Finder", icon: Compass },
  { section: "Studio" },
  { href: "/dashboard/analyzer", label: "Analyzer", icon: Lightbulb },
  { href: "/dashboard/library", label: "Library", icon: Library },
  { section: "Automation" },
  { href: "/dashboard/clipper", label: "AI Clipper", icon: Scissors, exact: true },
  { href: "/dashboard/clipper/autopilot", label: "Auto Pilot", icon: Bot },
  { href: "/dashboard/clipper/accounts", label: "Publisher Accounts", icon: Users },
];

export function DashboardLayoutClient({
  children,
  user,
}: {
  children: ReactNode;
  user?: SessionUser | null;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/user-auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch (e) {
      window.location.href = "/login";
    }
  };

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const isLinkActive = (item: NavLinkItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#F7F8FA] text-[#1A1D27] font-sans antialiased">
      {/* 1. Mobile Top Header Bar (< md) */}
      <header className="sticky top-0 z-30 flex md:hidden items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-700 transition-colors active:scale-95"
            aria-label="Buka Menu"
          >
            <Menu size={20} />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-blue-200">
              <Activity className="h-4 w-4" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-gray-900">Trend Intel</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/settings"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              pathname === "/dashboard/settings"
                ? "bg-blue-50 text-blue-600"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
            }`}
            aria-label="Settings"
          >
            <Settings size={18} />
          </Link>
        </div>
      </header>

      {/* 2. Mobile Drawer Navigation Overlay (< md) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="h-16 px-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-blue-200">
                  <Activity className="h-4 w-4" />
                </div>
                <span className="font-extrabold text-base tracking-tight text-gray-900">Trend Intel</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
                aria-label="Tutup Menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Nav Links */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {NAV_ITEMS.map((entry, idx) => {
                if ("section" in entry) {
                  return (
                    <div key={idx} className="pt-4 pb-1">
                      <p className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {entry.section}
                      </p>
                    </div>
                  );
                }

                const active = isLinkActive(entry);
                const Icon = entry.icon;

                return (
                  <Link
                    key={entry.href}
                    href={entry.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      active
                        ? "bg-blue-50 text-blue-600 font-bold"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon size={18} className={active ? "text-blue-600" : "text-gray-400"} />
                    <span>{entry.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-gray-100 flex flex-col gap-2 bg-gray-50/50">
              {user && (
                <div className="px-3.5 py-2.5 rounded-xl bg-white border border-gray-100 flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0">
                      {user.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-gray-900 truncate">{user.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">@{user.username}</p>
                    </div>
                  </div>
                </div>
              )}
              <ManualScrapeButton forceShowLabel={true} />
              <Link
                href="/dashboard/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  pathname === "/dashboard/settings"
                    ? "bg-blue-50 text-blue-600 font-bold"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Settings size={18} className="text-gray-400" />
                <span>Settings</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-all text-left"
              >
                <LogOut size={18} className="text-red-500" />
                <span>Keluar (Logout)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Desktop / Tablet Sidebar (>= md) */}
      <aside className="hidden md:flex w-20 lg:w-64 border-r border-gray-100 bg-white flex-col transition-all duration-300 shrink-0">
        <div className="h-20 lg:h-24 flex items-center justify-center lg:justify-start lg:px-6 border-b border-gray-50">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-200">
            <Activity className="h-5 w-5" />
          </div>
          <span className="ml-3 font-bold text-lg hidden lg:block tracking-tight text-gray-900">Trend Intel</span>
        </div>

        <nav className="flex-1 py-6 flex flex-col gap-1 overflow-y-auto px-3 lg:px-4">
          {NAV_ITEMS.map((entry, idx) => {
            if ("section" in entry) {
              return (
                <div key={idx} className="pt-4 pb-1 hidden lg:block">
                  <p className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {entry.section}
                  </p>
                </div>
              );
            }

            const active = isLinkActive(entry);
            const Icon = entry.icon;

            return (
              <Link
                key={entry.href}
                href={entry.href}
                title={entry.label}
                className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl transition-all duration-200 group ${
                  active
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <div className={`shrink-0 ${active ? "text-blue-600" : "text-gray-400 group-hover:text-gray-900"}`}>
                  <Icon size={20} />
                </div>
                <span className={`font-semibold text-sm hidden lg:block truncate ${active ? "text-blue-700 font-bold" : ""}`}>
                  {entry.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 lg:p-4 border-t border-gray-50 flex flex-col gap-2">
          {user && (
            <div className="hidden lg:flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-gray-50 border border-gray-100 mb-1">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-gray-900 truncate">{user.name}</p>
                <p className="text-[10px] text-gray-400 truncate">@{user.username}</p>
              </div>
            </div>
          )}
          <ManualScrapeButton />
          <Link
            href="/dashboard/settings"
            title="Settings"
            className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl transition-all duration-200 group ${
              pathname === "/dashboard/settings"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <div className={`shrink-0 ${pathname === "/dashboard/settings" ? "text-blue-600" : "text-gray-400 group-hover:text-gray-900"}`}>
              <Settings size={20} />
            </div>
            <span className={`font-semibold text-sm hidden lg:block ${pathname === "/dashboard/settings" ? "text-blue-700 font-bold" : ""}`}>
              Settings
            </span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            title="Keluar (Logout)"
            className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl transition-all duration-200 group text-red-500 hover:bg-red-50 hover:text-red-700 text-left"
          >
            <div className="shrink-0 text-red-500 group-hover:text-red-700">
              <LogOut size={20} />
            </div>
            <span className="font-semibold text-sm hidden lg:block">
              Keluar
            </span>
          </button>
        </div>
      </aside>

      {/* 4. Main Scrollable Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </div>

        {/* 5. Mobile Bottom Tab Navigation (< md) */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-100 flex items-center justify-around py-2 px-1 shadow-[0_-4px_20px_rgb(0,0,0,0.05)]"
          aria-label="Navigasi Bawah"
        >
          <BottomTabLink
            href="/dashboard"
            icon={<LayoutDashboard size={20} />}
            label="Home"
            active={pathname === "/dashboard"}
          />
          <BottomTabLink
            href="/dashboard/trending"
            icon={<Flame size={20} />}
            label="Trending"
            active={pathname.startsWith("/dashboard/trending")}
          />
          <BottomTabLink
            href="/dashboard/clipper"
            icon={<Scissors size={20} />}
            label="Clipper"
            active={pathname === "/dashboard/clipper"}
          />
          <BottomTabLink
            href="/dashboard/clipper/autopilot"
            icon={<Bot size={20} />}
            label="AutoPilot"
            active={pathname.startsWith("/dashboard/clipper/autopilot")}
          />
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-gray-500 hover:text-gray-900 transition-colors"
          >
            <Menu size={20} />
            <span className="text-[10px] font-bold mt-0.5">Menu</span>
          </button>
        </nav>
      </main>
    </div>
  );
}

function BottomTabLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
        active ? "text-blue-600 font-bold" : "text-gray-500 hover:text-gray-900"
      }`}
    >
      <div className={`transition-transform ${active ? "scale-110" : ""}`}>{icon}</div>
      <span className={`text-[10px] mt-0.5 ${active ? "font-bold" : "font-medium"}`}>{label}</span>
    </Link>
  );
}
