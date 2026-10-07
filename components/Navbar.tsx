"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  Building2,
  GraduationCap,
  Loader2,
  LogOut,
  Search,
  Settings,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Role =
  | "school_admin"
  | "super_admin"
  | "teacher"
  | "accountant";

type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  type:
    | "student"
    | "class"
    | "staff"
    | "module";
};

export default function Navbar() {
  const router = useRouter();

  const searchBoxRef =
    useRef<HTMLDivElement | null>(null);

  const [fullName, setFullName] =
    useState("");

  const [role, setRole] =
    useState<Role | null>(null);

  const [schoolName, setSchoolName] =
    useState("SchoolIQ");

  const [query, setQuery] =
    useState("");

  const [results, setResults] =
    useState<SearchResult[]>([]);

  const [searching, setSearching] =
    useState(false);

  const [showResults, setShowResults] =
    useState(false);

  /*
  ==========================================
  LOAD USER
  ==========================================
  */

  useEffect(() => {
    loadNavbar();
  }, []);

  async function loadNavbar() {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const {
      data: profile,
    } = await supabase
      .from("profiles")
      .select(`
        full_name,
        role,
        school_id
      `)
      .eq("id", user.id)
      .single();

    if (!profile) return;

    setFullName(
      profile.full_name ??
        user.email ??
        "User"
    );

    setRole(
      profile.role as Role
    );

    if (profile.school_id) {
      const {
        data: school,
      } = await supabase
        .from("schools")
        .select("name")
        .eq(
          "id",
          profile.school_id
        )
        .single();

      if (school?.name) {
        setSchoolName(
          school.name
        );
      }
    }
  }

  /*
  ==========================================
  CLOSE SEARCH ON OUTSIDE CLICK
  ==========================================
  */

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent
    ) {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(
          event.target as Node
        )
      ) {
        setShowResults(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  /*
  ==========================================
  GLOBAL SEARCH
  ==========================================
  */

  useEffect(() => {
    const trimmed =
      query.trim();

    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    const timer =
      setTimeout(() => {
        runSearch(trimmed);
      }, 300);

    return () =>
      clearTimeout(timer);
  }, [query, role]);

  async function runSearch(
    searchText: string
  ) {
    setSearching(true);

    const supabase =
      createClient();

    const clean =
      searchText
        .replace(
          /[,()%]/g,
          " "
        )
        .trim();

    const output:
      SearchResult[] = [];

    /*
    ==========================================
    MODULE SEARCH
    ==========================================
    */

    const modules = [
      {
        title: "Dashboard",
        keywords:
          "dashboard home overview",
        href: "/",
        roles: [
          "school_admin",
          "super_admin",
          "teacher",
          "accountant",
        ] as Role[],
      },

      {
        title: "Students",
        keywords:
          "student students admission",
        href: "/students",
        roles: [
          "school_admin",
          "super_admin",
          "teacher",
        ] as Role[],
      },

      {
        title:
          "Classes & Sections",
        keywords:
          "class classes section sections",
        href: "/classes",
        roles: [
          "school_admin",
          "super_admin",
          "teacher",
        ] as Role[],
      },

      {
        title: "Attendance",
        keywords:
          "attendance present absent late leave",
        href: "/attendance",
        roles: [
          "school_admin",
          "super_admin",
          "teacher",
        ] as Role[],
      },

      {
        title:
          "Fees & Payments",
        keywords:
          "fees fee payment payments invoice",
        href: "/fees",
        roles: [
          "school_admin",
          "super_admin",
          "accountant",
        ] as Role[],
      },

      {
        title: "Reports",
        keywords:
          "report reports analytics",
        href: "/reports",
        roles: [
          "school_admin",
          "super_admin",
          "accountant",
        ] as Role[],
      },

      {
        title:
          "Staff & Users",
        keywords:
          "staff teacher accountant users",
        href: "/staff",
        roles: [
          "school_admin",
        ] as Role[],
      },

      {
        title: "Settings",
        keywords:
          "settings school profile",
        href: "/settings",
        roles: [
          "school_admin",
        ] as Role[],
      },
    ];

    const lowerSearch =
      clean.toLowerCase();

    modules
      .filter(
        (item) =>
          role &&
          item.roles.includes(
            role
          )
      )
      .filter(
        (item) =>
          item.title
            .toLowerCase()
            .includes(
              lowerSearch
            ) ||
          item.keywords.includes(
            lowerSearch
          )
      )
      .forEach((item) => {
        output.push({
          id:
            `module-${item.href}`,

          title:
            item.title,

          subtitle:
            "SchoolIQ Module",

          href:
            item.href,

          type:
            "module",
        });
      });

    /*
    ==========================================
    STUDENT SEARCH
    ==========================================
    */

    if (
      role === "school_admin" ||
      role === "super_admin" ||
      role === "teacher"
    ) {
      const {
        data: studentData,
      } = await supabase
        .from("students")
        .select(`
          id,
          admission_no,
          first_name,
          last_name
        `)
        .or(
          `first_name.ilike.%${clean}%,last_name.ilike.%${clean}%,admission_no.ilike.%${clean}%`
        )
        .limit(5);

      (
        studentData ?? []
      ).forEach(
        (student) => {
          const name =
            `${student.first_name} ${
              student.last_name ??
              ""
            }`.trim();

          output.push({
            id:
              `student-${student.id}`,

            title: name,

            subtitle:
              `Student • ${student.admission_no}`,

            href:
              `/students/${student.id}`,

            type:
              "student",
          });
        }
      );
    }

    /*
    ==========================================
    CLASS SEARCH
    ==========================================
    */

    if (
      role === "school_admin" ||
      role === "super_admin" ||
      role === "teacher"
    ) {
      const {
        data: classData,
      } = await supabase
        .from("classes")
        .select(`
          id,
          name
        `)
        .ilike(
          "name",
          `%${clean}%`
        )
        .limit(5);

      (
        classData ?? []
      ).forEach(
        (schoolClass) => {
          output.push({
            id:
              `class-${schoolClass.id}`,

            title:
              schoolClass.name,

            subtitle:
              "Class",

            href:
              "/classes",

            type:
              "class",
          });
        }
      );
    }

    /*
    ==========================================
    STAFF SEARCH
    ==========================================
    */

    if (
      role === "school_admin"
    ) {
      const {
        data: staffData,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          role
        `)
        .in(
          "role",
          [
            "teacher",
            "accountant",
          ]
        )
        .ilike(
          "full_name",
          `%${clean}%`
        )
        .limit(5);

      (
        staffData ?? []
      ).forEach(
        (staff) => {
          output.push({
            id:
              `staff-${staff.id}`,

            title:
              staff.full_name,

            subtitle:
              formatRole(
                staff.role as Role
              ),

            href:
              "/staff",

            type:
              "staff",
          });
        }
      );
    }

    setResults(
      output.slice(
        0,
        10
      )
    );

    setSearching(false);
    setShowResults(true);
  }

  /*
  ==========================================
  SEARCH NAVIGATION
  ==========================================
  */

  function openResult(
    result: SearchResult
  ) {
    setQuery("");
    setResults([]);
    setShowResults(false);

    router.push(
      result.href
    );
  }

  function handleKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {
    if (
      event.key === "Enter" &&
      results.length > 0
    ) {
      openResult(
        results[0]
      );
    }

    if (
      event.key === "Escape"
    ) {
      setShowResults(false);
    }
  }

  /*
  ==========================================
  LOGOUT
  ==========================================
  */

  async function logout() {
    const supabase =
      createClient();

    await supabase.auth.signOut();

    router.replace(
      "/login"
    );

    router.refresh();
  }

  /*
  ==========================================
  UI
  ==========================================
  */

  return (
    <header
      className="
        sticky top-0 z-30
        flex h-16 items-center
        border-b border-slate-200
        bg-white
        pl-16 pr-3
        sm:px-4 sm:pl-16
        lg:px-6
      "
    >
      <div className="flex w-full min-w-0 items-center justify-between gap-3">
        {/* ==================================
            GLOBAL SEARCH
        ================================== */}

        <div
          ref={searchBoxRef}
          className="
            relative
            min-w-0
            flex-1
            sm:max-w-md
          "
        >
          <div
            className="
              flex h-10
              items-center gap-2
              rounded-xl
              bg-slate-100
              px-3
              sm:gap-3
              sm:px-4
            "
          >
            {searching ? (
              <Loader2
                size={17}
                className="shrink-0 animate-spin text-slate-400"
              />
            ) : (
              <Search
                size={17}
                className="shrink-0 text-slate-400"
              />
            )}

            <input
              value={query}
              onChange={(e) => {
                setQuery(
                  e.target.value
                );

                setShowResults(
                  true
                );
              }}
              onFocus={() =>
                setShowResults(
                  true
                )
              }
              onKeyDown={
                handleKeyDown
              }
              placeholder="Search..."
              className="
                min-w-0
                w-full
                bg-transparent
                text-sm
                text-slate-700
                outline-none
                placeholder:text-slate-400
                sm:placeholder:text-transparent
              "
            />

            {/* Desktop placeholder overlay */}

            {!query && (
              <span
                className="
                  pointer-events-none
                  absolute
                  left-11
                  hidden
                  text-sm
                  text-slate-400
                  sm:block
                "
              >
                Search students, staff,
                classes...
              </span>
            )}

            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setResults([]);
                }}
                className="shrink-0 text-slate-400 hover:text-slate-700"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* SEARCH RESULTS */}

          {showResults &&
            query.trim().length >=
              2 && (
              <div
                className="
                  absolute
                  left-0
                  top-[48px]
                  z-50
                  w-[min(90vw,28rem)]
                  overflow-hidden
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  shadow-xl
                  sm:right-0
                  sm:w-full
                "
              >
                {searching ? (
                  <div className="flex items-center justify-center gap-2 p-5 text-sm text-slate-500">
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />

                    Searching...
                  </div>
                ) : results.length ===
                  0 ? (
                  <div className="p-5 text-center text-sm text-slate-500">
                    No results found.
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto p-2">
                    {results.map(
                      (result) => (
                        <button
                          key={
                            result.id
                          }
                          onClick={() =>
                            openResult(
                              result
                            )
                          }
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-slate-50"
                        >
                          <SearchResultIcon
                            type={
                              result.type
                            }
                          />

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {
                                result.title
                              }
                            </p>

                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {
                                result.subtitle
                              }
                            </p>
                          </div>
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
        </div>

        {/* ==================================
            RIGHT SIDE
        ================================== */}

        <div className="flex shrink-0 items-center gap-2 sm:gap-3 lg:gap-4">
          {/* SCHOOL */}

          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 xl:flex">
            <Building2
              size={16}
              className="text-orange-500"
            />

            <span className="max-w-40 truncate text-xs font-semibold text-slate-700">
              {schoolName}
            </span>
          </div>

          {/* USER */}

          <div className="hidden min-w-28 md:block">
            <p className="max-w-36 truncate text-xs font-semibold text-slate-800">
              {fullName ||
                "User"}
            </p>

            <p className="mt-0.5 text-[11px] text-slate-500">
              {role
                ? formatRole(
                    role
                  )
                : "Loading..."}
            </p>
          </div>

          {/* MOBILE USER INITIAL */}

          <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600 sm:flex md:hidden">
            {fullName
              ? fullName
                  .charAt(0)
                  .toUpperCase()
              : "U"}
          </div>

          {/* LOGOUT */}

          <button
            onClick={logout}
            title="Logout"
            className="
              flex h-10 w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-slate-200
              text-slate-500
              transition
              hover:border-red-200
              hover:bg-red-50
              hover:text-red-600
            "
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}

/*
==========================================
SEARCH RESULT ICON
==========================================
*/

function SearchResultIcon({
  type,
}: {
  type:
    | "student"
    | "class"
    | "staff"
    | "module";
}) {
  const common =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600";

  if (
    type === "student"
  ) {
    return (
      <div className={common}>
        <UserRound
          size={17}
        />
      </div>
    );
  }

  if (
    type === "class"
  ) {
    return (
      <div className={common}>
        <GraduationCap
          size={17}
        />
      </div>
    );
  }

  if (
    type === "staff"
  ) {
    return (
      <div className={common}>
        <Users
          size={17}
        />
      </div>
    );
  }

  return (
    <div className={common}>
      <Settings
        size={17}
      />
    </div>
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