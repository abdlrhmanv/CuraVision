"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Brain,
  FileText,
  Newspaper,
  User,
  Settings,
  LogOut,
  Inbox,
  Users,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";

interface SidebarProps {
  role: "patient" | "doctor";
  collapsed: boolean;
  onNavigate?: () => void;
}

export default function Sidebar({ role, collapsed, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

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
      id: "appointments",
      label: "Appointments",
      icon: Calendar,
      href: "/patient/appointments",
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
      id: "scans",
      label: "Scans",
      icon: Brain,
      href: "/doctor/scans",
    },
    {
      id: "upload",
      label: "New Scan",
      icon: Inbox,
      href: "/doctor/upload",
    },
    {
      id: "patients",
      label: "Patients",
      icon: Users,
      href: "/doctor/patients",
    },
    {
      id: "appointments",
      label: "Appointments",
      icon: Calendar,
      href: "/doctor/appointments",
    },
    { id: "profile", label: "My Profile", icon: User, href: "/doctor/profile" },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      href: "/doctor/settings",
    },
  ];

  const menuItems = role === "patient" ? patientItems : doctorItems;

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
          {role === "patient" ? "Health Hub" : "Workspace"}
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

        <div className="mt-8 pt-4 border-t border-border">
          <button
            onClick={logout}
            className="w-full text-left px-5 py-2.5 text-sm flex items-center gap-3 text-muted hover:bg-card hover:text-white transition"
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
