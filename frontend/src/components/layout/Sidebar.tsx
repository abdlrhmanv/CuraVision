"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LucideIcon,
  LayoutDashboard,
  MessageSquare,
  Brain,
  FileText,
  Newspaper,
  User,
  Settings,
  LogOut,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

interface SidebarProps {
  role?: "patient" | "doctor" | "admin";
  collapsed?: boolean;
  onNavigate?: () => void;
  user?: unknown;
  navItems?: NavItem[];
}

export default function Sidebar({ role, collapsed = false, onNavigate, navItems }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const authContext = useAuth();
  const logout = authContext?.logout;

  const patientItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/patient",
    },
    {
      id: "chatbot",
      label: "AI Chatbot",
      icon: MessageSquare,
      href: "/patient/chatbot",
    },
    { id: "scans", label: "My Scans", icon: Brain, href: "/patient/scans" },
    {
      id: "reports",
      label: "Reports",
      icon: FileText,
      href: "/patient/reports",
    },
    {
      id: "articles",
      label: "Community Articles",
      icon: Newspaper,
      href: "/patient/articles",
    },
    {
      id: "profile",
      label: "My Profile",
      icon: User,
      href: "/patient/profile",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      href: "/patient/settings",
    },
  ];

  const doctorItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/doctor",
    },
    {
      id: "patients",
      label: "Patients",
      icon: Users,
      href: "/doctor/patients",
    },
    { id: "profile", label: "My Profile", icon: User, href: "/doctor/profile" },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      href: "/doctor/settings",
    },
  ];

  const adminItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/admin",
    },
    {
      id: "users",
      label: "Users",
      icon: Users,
      href: "/admin/users",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      href: "/admin/settings",
    },
  ];

  let menuItems: MenuItem[] = [];
  if (navItems) {
    menuItems = navItems.map((item, idx) => ({
      id: `nav-${idx}`,
      label: item.label,
      icon: item.icon,
      href: item.href,
    }));
  } else if (role === "patient") {
    menuItems = patientItems;
  } else if (role === "doctor") {
    menuItems = doctorItems;
  } else if (role === "admin") {
    menuItems = adminItems;
  }

  const handleNavigation = (href: string) => {
    router.push(href);
    if (onNavigate) onNavigate();
  };

  return (
    <aside
      className={`border-r border-border bg-surface transition-all duration-300 ${
        collapsed ? "w-0 overflow-hidden" : "w-[260px]"
      }`}
    >
      <div className="py-6">
        <div className="px-5 mb-2 text-[10px] tracking-[2px] uppercase text-sub font-semibold">
          {role === "patient" ? "Health Hub" : role === "admin" ? "Admin Portal" : "Workspace"}
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.href)}
              className={`w-full text-left px-5 py-2.5 text-sm flex items-center gap-3 border-l-2 transition-all duration-200 ${
                isActive
                  ? role === "patient"
                    ? "text-accent bg-accent/5 border-accent"
                    : "text-blue bg-blue/5 border-blue"
                  : "text-muted border-transparent hover:bg-card hover:text-white"
              }`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {logout && (
          <div className="mt-8 pt-4 border-t border-border">
            <button
              onClick={logout}
              className="w-full text-left px-5 py-2.5 text-sm flex items-center gap-3 text-muted hover:bg-card hover:text-white transition"
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
