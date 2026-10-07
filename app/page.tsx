"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  CalendarCheck,
  CreditCard,
  Loader2,
  ReceiptText,
  Users,
  WalletCards,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";

type Role =
  | "super_admin"
  | "school_admin"
  | "teacher"
  | "accountant";

type Student = {
  id: string;
  status: string;
};

type Attendance = {
  attendance_date: string;
  status:
    | "Present"
    | "Absent"
    | "Late"
    | "Leave";
};

type Invoice = {
  amount: number;
  discount: number;
  fine: number;
};

type Payment = {
  amount: number;
  payment_date: string;
};

/*
==========================================
LOCAL DATE KEY
==========================================
*/

function localDateKey(
  date = new Date()
) {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/*
==========================================
DASHBOARD
==========================================
*/

export default function Home() {
  const [role, setRole] =
    useState<Role | null>(null);

  const [students, setStudents] =
    useState<Student[]>([]);

  const [
    attendance,
    setAttendance,
  ] = useState<Attendance[]>([]);

  const [invoices, setInvoices] =
    useState<Invoice[]>([]);

  const [payments, setPayments] =
    useState<Payment[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
  ==========================================
  LOAD DASHBOARD
  ==========================================
  */

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError("");

      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      /*
      ----------------------------------------
      USER ROLE
      ----------------------------------------
      */

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (
        profileError ||
        !profile
      ) {
        setError(
          profileError?.message ??
            "Unable to load user role."
        );

        setLoading(false);
        return;
      }

      const currentRole =
        profile.role as Role;

      setRole(currentRole);

      const canSeeAcademic =
        currentRole ===
          "school_admin" ||
        currentRole ===
          "super_admin" ||
        currentRole ===
          "teacher";

      const canSeeFinance =
        currentRole ===
          "school_admin" ||
        currentRole ===
          "super_admin" ||
        currentRole ===
          "accountant";

      /*
      ----------------------------------------
      ACADEMIC DATA
      ----------------------------------------
      */

      if (canSeeAcademic) {
        const [
          studentsResult,
          attendanceResult,
        ] = await Promise.all([
          supabase
            .from("students")
            .select(
              "id, status"
            ),

          supabase
            .from("attendance")
            .select(
              "attendance_date, status"
            ),
        ]);

        if (
          studentsResult.error
        ) {
          setError(
            studentsResult.error
              .message
          );

          setLoading(false);
          return;
        }

        if (
          attendanceResult.error
        ) {
          setError(
            attendanceResult.error
              .message
          );

          setLoading(false);
          return;
        }

        setStudents(
          studentsResult.data ??
            []
        );

        setAttendance(
          (attendanceResult.data ??
            []) as Attendance[]
        );
      }

      /*
      ----------------------------------------
      FINANCE DATA
      ----------------------------------------
      */

      if (canSeeFinance) {
        const [
          invoicesResult,
          paymentsResult,
        ] = await Promise.all([
          supabase
            .from("fee_invoices")
            .select(
              "amount, discount, fine"
            ),

          supabase
            .from("fee_payments")
            .select(
              "amount, payment_date"
            ),
        ]);

        if (
          invoicesResult.error
        ) {
          setError(
            invoicesResult.error
              .message
          );

          setLoading(false);
          return;
        }

        if (
          paymentsResult.error
        ) {
          setError(
            paymentsResult.error
              .message
          );

          setLoading(false);
          return;
        }

        setInvoices(
          invoicesResult.data ??
            []
        );

        setPayments(
          paymentsResult.data ??
            []
        );
      }

      setLoading(false);
    }

    loadDashboard();
  }, []);

  /*
  ==========================================
  PERMISSIONS
  ==========================================
  */

  const canSeeAcademic =
    role === "school_admin" ||
    role === "super_admin" ||
    role === "teacher";

  const canSeeFinance =
    role === "school_admin" ||
    role === "super_admin" ||
    role === "accountant";

  /*
  ==========================================
  STUDENTS + ATTENDANCE
  ==========================================
  */

  const activeStudents =
    students.filter(
      (student) =>
        student.status ===
        "Active"
    ).length;

  const today =
    localDateKey();

  const todayAttendance =
    attendance.filter(
      (item) =>
        item.attendance_date ===
        today
    );

  const attendedToday =
    todayAttendance.filter(
      (item) =>
        item.status ===
          "Present" ||
        item.status ===
          "Late"
    ).length;

  const todayAttendanceRate =
    todayAttendance.length > 0
      ? (attendedToday /
          todayAttendance.length) *
        100
      : 0;

  /*
  ==========================================
  FINANCE
  ==========================================
  */

  const totalBilled =
    invoices.reduce(
      (
        sum,
        invoice
      ) =>
        sum +
        Number(
          invoice.amount
        ) -
        Number(
          invoice.discount
        ) +
        Number(
          invoice.fine
        ),
      0
    );

  const totalCollected =
    payments.reduce(
      (
        sum,
        payment
      ) =>
        sum +
        Number(
          payment.amount
        ),
      0
    );

  const outstanding =
    Math.max(
      totalBilled -
        totalCollected,
      0
    );

  /*
  ==========================================
  ATTENDANCE TREND
  ==========================================
  */

  const attendanceTrend =
    useMemo(() => {
      const result = [];

      for (
        let i = 6;
        i >= 0;
        i--
      ) {
        const date =
          new Date();

        date.setDate(
          date.getDate() - i
        );

        const key =
          localDateKey(date);

        const records =
          attendance.filter(
            (item) =>
              item.attendance_date ===
              key
          );

        const attended =
          records.filter(
            (item) =>
              item.status ===
                "Present" ||
              item.status ===
                "Late"
          ).length;

        const rate =
          records.length > 0
            ? Math.round(
                (attended /
                  records.length) *
                  100
              )
            : 0;

        result.push({
          date:
            date.toLocaleDateString(
              "en-US",
              {
                day: "numeric",
                month: "short",
              }
            ),

          attendance:
            rate,
        });
      }

      return result;
    }, [attendance]);

  /*
  ==========================================
  FEE COLLECTION TREND
  ==========================================
  */

  const feeCollection =
    useMemo(() => {
      const result = [];

      for (
        let i = 5;
        i >= 0;
        i--
      ) {
        const date =
          new Date();

        date.setMonth(
          date.getMonth() - i
        );

        const year =
          date.getFullYear();

        const month =
          date.getMonth();

        const collected =
          payments
            .filter(
              (payment) => {
                const paymentDate =
                  new Date(
                    `${payment.payment_date}T00:00:00`
                  );

                return (
                  paymentDate.getFullYear() ===
                    year &&
                  paymentDate.getMonth() ===
                    month
                );
              }
            )
            .reduce(
              (
                sum,
                payment
              ) =>
                sum +
                Number(
                  payment.amount
                ),
              0
            );

        result.push({
          month:
            date.toLocaleDateString(
              "en-US",
              {
                month:
                  "short",
              }
            ),

          collected,
        });
      }

      return result;
    }, [payments]);

  /*
  ==========================================
  HELPERS
  ==========================================
  */

  function money(
    value: number
  ) {
    return `Rs. ${value.toLocaleString()}`;
  }

  function compactMoney(
    value: number
  ) {
    if (
      value >= 1000000
    ) {
      return `${(
        value / 1000000
      ).toFixed(1)}M`;
    }

    if (
      value >= 1000
    ) {
      return `${Math.round(
        value / 1000
      )}K`;
    }

    return value.toString();
  }

  /*
  ==========================================
  LOADING
  ==========================================
  */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f4f7fb]">
        <Sidebar />

        <section className="ml-64 min-h-screen">
          <Navbar />

          <div className="flex min-h-[70vh] items-center justify-center p-4">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2 className="animate-spin" />

              Loading dashboard...
            </div>
          </div>
        </section>
      </main>
    );
  }

  /*
  ==========================================
  UI
  ==========================================
  */

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <Sidebar />

      <section className="ml-64 min-h-screen">
        <Navbar />

        <div className="p-4 sm:p-5 lg:p-7">
          {/* ==================================
              HEADER
          ================================== */}

          <div className="mb-6">
            <h1 className="text-2xl font-bold sm:text-3xl">
              Dashboard
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Overview based on
              your account
              permissions.
            </p>
          </div>

          {/* ERROR */}

          {error && (
            <div className="mb-5 break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* ==================================
              KPI CARDS
          ================================== */}

          <div
            className={`mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 ${
              canSeeAcademic &&
              canSeeFinance
                ? "xl:grid-cols-4"
                : "xl:grid-cols-2"
            }`}
          >
            {canSeeAcademic && (
              <>
                <Kpi
                  title="Total Students"
                  value={activeStudents.toString()}
                  icon={
                    <Users
                      size={21}
                    />
                  }
                />

                <Kpi
                  title="Today's Attendance"
                  value={`${todayAttendanceRate.toFixed(
                    1
                  )}%`}
                  icon={
                    <CalendarCheck
                      size={21}
                    />
                  }
                />
              </>
            )}

            {canSeeFinance && (
              <>
                <Kpi
                  title="Fees Collected"
                  value={money(
                    totalCollected
                  )}
                  icon={
                    <CreditCard
                      size={21}
                    />
                  }
                />

                <Kpi
                  title="Outstanding Fees"
                  value={money(
                    outstanding
                  )}
                  icon={
                    <WalletCards
                      size={21}
                    />
                  }
                />
              </>
            )}
          </div>

          {/* ==================================
              CHARTS
          ================================== */}

          <div
            className={`mb-6 grid min-w-0 grid-cols-1 gap-4 sm:gap-6 ${
              canSeeAcademic &&
              canSeeFinance
                ? "xl:grid-cols-2"
                : ""
            }`}
          >
            {/* ATTENDANCE CHART */}

            {canSeeAcademic && (
              <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-4 sm:mb-5">
                  <h2 className="font-bold">
                    Attendance Trend
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Last 7 days
                  </p>
                </div>

                <div className="h-60 min-w-0 sm:h-72">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <LineChart
                      data={
                        attendanceTrend
                      }
                      margin={{
                        top: 5,
                        right: 8,
                        left: -18,
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        dataKey="date"
                        tick={{
                          fontSize: 11,
                        }}
                        tickMargin={8}
                      />

                      <YAxis
                        domain={[
                          0,
                          100,
                        ]}
                        unit="%"
                        tick={{
                          fontSize: 11,
                        }}
                        width={45}
                      />

                      <Tooltip />

                      <Line
                        type="monotone"
                        dataKey="attendance"
                        stroke="#3b5bfd"
                        strokeWidth={3}
                        dot={{
                          r: 3,
                        }}
                        activeDot={{
                          r: 5,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* FINANCE CHART */}

            {canSeeFinance && (
              <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-4 sm:mb-5">
                  <h2 className="font-bold">
                    Fee Collection
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Last 6 months
                  </p>
                </div>

                <div className="h-60 min-w-0 sm:h-72">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={
                        feeCollection
                      }
                      margin={{
                        top: 5,
                        right: 8,
                        left: -10,
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        dataKey="month"
                        tick={{
                          fontSize: 11,
                        }}
                        tickMargin={8}
                      />

                      <YAxis
                        tickFormatter={
                          compactMoney
                        }
                        tick={{
                          fontSize: 11,
                        }}
                        width={50}
                      />

                      <Tooltip
                        formatter={(
                          value
                        ) => [
                          money(
                            Number(
                              value
                            )
                          ),
                          "Collected",
                        ]}
                      />

                      <Bar
                        dataKey="collected"
                        fill="#22c55e"
                        radius={[
                          6,
                          6,
                          0,
                          0,
                        ]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* ==================================
              QUICK ACTIONS
          ================================== */}

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="mb-4 font-bold sm:mb-5">
              Quick Actions
            </h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
              {canSeeAcademic && (
                <>
                  <QuickAction
                    href="/students"
                    title="View Students"
                    icon={
                      <Users
                        size={20}
                      />
                    }
                  />

                  <QuickAction
                    href="/attendance"
                    title="Mark Attendance"
                    icon={
                      <CalendarCheck
                        size={20}
                      />
                    }
                  />
                </>
              )}

              {canSeeFinance && (
                <>
                  <QuickAction
                    href="/fees"
                    title="Fees & Payments"
                    icon={
                      <CreditCard
                        size={20}
                      />
                    }
                  />

                  <QuickAction
                    href="/reports"
                    title="View Reports"
                    icon={
                      <ReceiptText
                        size={20}
                      />
                    }
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

/*
==========================================
KPI CARD
==========================================
*/

function Kpi({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 sm:h-11 sm:w-11">
        {icon}
      </div>

      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-1 break-words text-xl font-bold sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

/*
==========================================
QUICK ACTION
==========================================
*/

function QuickAction({
  href,
  title,
  icon,
}: {
  href: string;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-4 font-semibold transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
    >
      <span className="shrink-0">
        {icon}
      </span>

      <span className="min-w-0 break-words">
        {title}
      </span>
    </Link>
  );
}