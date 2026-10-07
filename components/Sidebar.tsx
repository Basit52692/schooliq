"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Settings,
  UserCog,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import {
  usePathname,
} from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Role =
  | "school_admin"
  | "super_admin"
  | "teacher"
  | "accountant";

type MenuItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: Role[];
};

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: <LayoutDashboard size={18} />,
    roles: [
      "school_admin",
      "super_admin",
      "teacher",
      "accountant",
    ],
  },

  {
    label: "Students",
    href: "/students",
    icon: <Users size={18} />,
    roles: [
      "school_admin",
      "super_admin",
      "teacher",
    ],
  },

  {
    label: "Classes & Sections",
    href: "/classes",
    icon: <GraduationCap size={18} />,
    roles: [
      "school_admin",
      "super_admin",
      "teacher",
    ],
  },

  {
    label: "Attendance",
    href: "/attendance",
    icon: <CalendarCheck size={18} />,
    roles: [
      "school_admin",
      "super_admin",
      "teacher",
    ],
  },

  {
    label: "Fees & Payments",
    href: "/fees",
    icon: <WalletCards size={18} />,
    roles: [
      "school_admin",
      "super_admin",
      "accountant",
    ],
  },

  {
    label: "Reports",
    href: "/reports",
    icon: <BarChart3 size={18} />,
    roles: [
      "school_admin",
      "super_admin",
      "accountant",
    ],
  },

  {
    label: "Staff & Users",
    href: "/staff",
    icon: <UserCog size={18} />,
    roles: ["school_admin"],
  },

  {
    label: "Settings",
    href: "/settings",
    icon: <Settings size={18} />,
    roles: ["school_admin"],
  },
];

export default function Sidebar() {
  const pathname =
    usePathname();

  const [role, setRole] =
    useState<Role | null>(null);

  const [fullName, setFullName] =
    useState("");

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  /*
  ==========================================
  LOAD CURRENT USER
  ==========================================
  */

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const supabase =
      createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) return;

    const {
      data: profile,
    } = await supabase
      .from("profiles")
      .select(`
        full_name,
        role
      `)
      .eq("id", user.id)
      .single();

    if (!profile) return;

    setFullName(
      profile.full_name ??
        "User"
    );

    setRole(
      profile.role as Role
    );
  }

  /*
  ==========================================
  CLOSE DRAWER AFTER ROUTE CHANGE
  ==========================================
  */

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  /*
  ==========================================
  PREVENT BODY SCROLL
  ==========================================
  */

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow =
        "hidden";
    } else {
      document.body.style.overflow =
        "";
    }

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [mobileOpen]);

  /*
  ==========================================
  ROLE FILTER
  ==========================================
  */

  const visibleItems =
    role
      ? menuItems.filter(
          (item) =>
            item.roles.includes(
              role
            )
        )
      : [];

  /*
  ==========================================
  ACTIVE ROUTE
  ==========================================
  */

  function isActive(
    href: string
  ) {
    if (href === "/") {
      return pathname === "/";
    }

    return (
      pathname === href ||
      pathname.startsWith(
        `${href}/`
      )
    );
  }

  /*
  ==========================================
  SIDEBAR CONTENT
  ==========================================
  */

  const content = (
    <div className="flex h-full flex-col">
      {/* LOGO */}

      <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
        <Link
          href="/"
          className="flex items-center gap-3"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
            <BookOpen
              size={18}
            />
          </div>

          <div>
            <p className="text-sm font-bold text-white">
              SchoolIQ
            </p>

            <p className="text-[10px] text-slate-400">
              School ERP
            </p>
          </div>
        </Link>

        {/* MOBILE CLOSE */}

        <button
          onClick={() =>
            setMobileOpen(false)
          }
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close menu"
        >
          <X size={19} />
        </button>
      </div>

      {/* NAVIGATION */}

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="space-y-1.5">
          {visibleItems.map(
            (item) => {
              const active =
                isActive(
                  item.href
                );

              return (
                <Link
                  key={
                    item.href
                  }
                  href={
                    item.href
                  }
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span
                    className={
                      active
                        ? "text-white"
                        : "text-slate-400"
                    }
                  >
                    {
                      item.icon
                    }
                  </span>

                  <span>
                    {
                      item.label
                    }
                  </span>
                </Link>
              );
            }
          )}
        </div>
      </nav>

      {/* USER */}

      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-sm font-bold text-blue-300">
              {fullName
                ? fullName
                    .charAt(0)
                    .toUpperCase()
                : "U"}
            </div>

            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">
                {fullName ||
                  "Loading..."}
              </p>

              <p className="mt-0.5 text-[10px] text-slate-400">
                {role
                  ? formatRole(
                      role
                    )
                  : "Loading..."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ====================================
          DESKTOP SIDEBAR
      ==================================== */}

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-[#0f172a] lg:block">
        {content}
      </aside>

      {/* ====================================
          MOBILE MENU BUTTON
      ==================================== */}

      {!mobileOpen && (
        <button
          onClick={() =>
            setMobileOpen(true)
          }
          className="fixed left-4 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f172a] text-white shadow-lg lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      )}

      {/* ====================================
          MOBILE OVERLAY
      ==================================== */}

      {mobileOpen && (
        <button
          onClick={() =>
            setMobileOpen(false)
          }
          aria-label="Close menu overlay"
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px] lg:hidden"
        />
      )}

      {/* ====================================
          MOBILE DRAWER
      ==================================== */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0f172a] shadow-2xl transition-transform duration-300 lg:hidden ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {content}
      </aside>

      {/* ====================================
          TEMP RESPONSIVE FIX

          Existing pages currently use:
          ml-64

          On mobile/tablet we override it so
          content uses full width.
      ==================================== */}

      <style jsx global>{`
        @media (max-width: 1023px) {
          .ml-64 {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </>
  );
}

/*
==========================================
ROLE LABEL
==========================================
*/

function formatRole(
  role: Role
) {
  switch (role) {
    case "school_admin":
      return "Administrator";

    case "super_admin":
      return "Super Admin";

    case "teacher":
      return "Teacher";

    case "accountant":
      return "Accountant";

    default:
      return "User";
  }
}