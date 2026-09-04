import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Building2,
  GitBranch,
  LayoutDashboard,
  Mail,
  Network,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export type NavSection = {
  heading?: string;
  items: NavItem[];
};

export const APP_VERSION = "v0.1.0";

export const SIDEBAR: NavSection[] = [
  {
    items: [{ href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard }],
  },
  {
    heading: "開拓",
    items: [
      { href: "/partners", label: "既存パートナー", icon: Users, adminOnly: true },
      { href: "/nodes", label: "名簿ノード", icon: Network, adminOnly: true },
      { href: "/companies", label: "候補一覧", icon: Building2 },
      { href: "/intro-requests", label: "依頼キュー", icon: Mail },
      { href: "/pipeline", label: "パイプライン", icon: GitBranch },
    ],
  },
  {
    heading: "分析",
    items: [{ href: "/analytics", label: "分析", icon: BarChart3 }],
  },
  {
    heading: "構築",
    items: [
      { href: "/scoring-rules", label: "スコア設定", icon: Scale, adminOnly: true },
      { href: "/skills", label: "スキル管理", icon: Sparkles, adminOnly: true },
      { href: "/admin", label: "システム管理", icon: ShieldCheck, adminOnly: true },
    ],
  },
  {
    heading: "ヘルプ",
    items: [{ href: "/manual", label: "取扱マニュアル", icon: BookOpen }],
  },
];

export function filterNavSections(sections: NavSection[], isAdmin: boolean): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.adminOnly || isAdmin),
    }))
    .filter((section) => section.items.length > 0);
}

export function resolveActiveHref(pathname: string, sections: NavSection[]): string | undefined {
  const allHrefs = sections.flatMap((section) => section.items.map((item) => item.href));
  return allHrefs
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

export function isSidebarItemActive(itemHref: string, activeHref: string | undefined, pathname: string): boolean {
  if (!activeHref) return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
  if (activeHref === itemHref) return true;
  if (itemHref === "/admin") {
    return pathname === "/admin" || pathname.startsWith("/admin/");
  }
  return false;
}
