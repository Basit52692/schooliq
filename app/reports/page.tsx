"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarCheck,
  CalendarRange,
  CreditCard,
  Download,
  Loader2,
  RotateCcw,
  TrendingUp,
  UserCheck,
  Users,
  WalletCards,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";

/*
==========================================
TYPES
==========================================
*/

type Student = {
  id: string;
  status: string;
};

type Attendance = {
  id: string;

  status:
    | "Present"
    | "Absent"
    | "Late"
    | "Leave";

  attendance_date: string;
};

type Invoice = {
  id: string;

  fee_month: string;

  amount: number;
  discount: number;
  fine: number;

  paid_amount: number;

  status: string;
};

type Payment = {
  id: string;

  amount: number;

  payment_date: string;
};

type MonthlyPayment = {
  key: string;
  label: string;
  amount: number;
};

/*
==========================================
HELPERS
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

function dateInRange(
  value: string,
  fromDate: string,
  toDate: string
) {
  if (!value) {
    return false;
  }

  if (
    fromDate &&
    value < fromDate
  ) {
    return false;
  }

  if (
    toDate &&
    value > toDate
  ) {
    return false;
  }

  return true;
}

function csvCell(
  value: string | number
) {
  const text =
    String(value ?? "");

  return `"${text.replace(
    /"/g,
    '""'
  )}"`;
}

/*
==========================================
REPORTS PAGE
==========================================
*/

export default function ReportsPage() {
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
  DATE FILTERS
  ==========================================
  */

  const [fromDate, setFromDate] =
    useState("");

  const [toDate, setToDate] =
    useState("");

  const invalidDateRange =
    Boolean(
      fromDate &&
        toDate &&
        fromDate > toDate
    );

  const filterActive =
    Boolean(
      fromDate ||
        toDate
    );

  /*
  ==========================================
  LOAD REPORT DATA
  ==========================================
  */

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      setError("");

      const supabase =
        createClient();

      const [
        studentsResult,
        attendanceResult,
        invoicesResult,
        paymentsResult,
      ] = await Promise.all([
        supabase
          .from("students")
          .select(
            "id, status"
          ),

        supabase
          .from("attendance")
          .select(
            "id, status, attendance_date"
          ),

        supabase
          .from("fee_invoices")
          .select(`
            id,
            fee_month,
            amount,
            discount,
            fine,
            paid_amount,
            status
          `),

        supabase
          .from("fee_payments")
          .select(`
            id,
            amount,
            payment_date
          `),
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

      setStudents(
        studentsResult.data ??
          []
      );

      setAttendance(
        (attendanceResult.data ??
          []) as Attendance[]
      );

      setInvoices(
        (invoicesResult.data ??
          []).map(
          (item: any) => ({
            ...item,

            amount:
              Number(
                item.amount
              ) || 0,

            discount:
              Number(
                item.discount
              ) || 0,

            fine:
              Number(
                item.fine
              ) || 0,

            paid_amount:
              Number(
                item.paid_amount
              ) || 0,
          })
        )
      );

      setPayments(
        (paymentsResult.data ??
          []).map(
          (item: any) => ({
            ...item,

            amount:
              Number(
                item.amount
              ) || 0,
          })
        )
      );

      setLoading(false);
    }

    loadReports();
  }, []);

  /*
  ==========================================
  FILTERED REPORT DATA
  ==========================================
  */

  const filteredAttendance =
    useMemo(() => {
      if (
        invalidDateRange
      ) {
        return attendance;
      }

      if (!filterActive) {
        return attendance;
      }

      return attendance.filter(
        (item) =>
          dateInRange(
            item.attendance_date,
            fromDate,
            toDate
          )
      );
    }, [
      attendance,
      fromDate,
      toDate,
      filterActive,
      invalidDateRange,
    ]);

  const filteredInvoices =
    useMemo(() => {
      if (
        invalidDateRange
      ) {
        return invoices;
      }

      if (!filterActive) {
        return invoices;
      }

      return invoices.filter(
        (invoice) =>
          dateInRange(
            invoice.fee_month,
            fromDate,
            toDate
          )
      );
    }, [
      invoices,
      fromDate,
      toDate,
      filterActive,
      invalidDateRange,
    ]);

  const filteredPayments =
    useMemo(() => {
      if (
        invalidDateRange
      ) {
        return payments;
      }

      if (!filterActive) {
        return payments;
      }

      return payments.filter(
        (payment) =>
          dateInRange(
            payment.payment_date,
            fromDate,
            toDate
          )
      );
    }, [
      payments,
      fromDate,
      toDate,
      filterActive,
      invalidDateRange,
    ]);

  /*
  ==========================================
  STUDENTS
  ==========================================
  */

  const totalStudents =
    students.length;

  const activeStudents =
    students.filter(
      (student) =>
        student.status ===
        "Active"
    ).length;

  /*
  ==========================================
  ATTENDANCE
  ==========================================
  */

  const presentCount =
    filteredAttendance.filter(
      (item) =>
        item.status ===
        "Present"
    ).length;

  const absentCount =
    filteredAttendance.filter(
      (item) =>
        item.status ===
        "Absent"
    ).length;

  const lateCount =
    filteredAttendance.filter(
      (item) =>
        item.status ===
        "Late"
    ).length;

  const leaveCount =
    filteredAttendance.filter(
      (item) =>
        item.status ===
        "Leave"
    ).length;

  const attendancePercentage =
    filteredAttendance.length > 0
      ? ((presentCount +
          lateCount) /
          filteredAttendance.length) *
        100
      : 0;

  /*
  ==========================================
  FEES
  ==========================================
  */

  function invoiceTotal(
    invoice: Invoice
  ) {
    return Math.max(
      0,

      Number(
        invoice.amount
      ) -
        Number(
          invoice.discount
        ) +
        Number(
          invoice.fine
        )
    );
  }

  const totalBilled =
    filteredInvoices.reduce(
      (
        sum,
        invoice
      ) =>
        sum +
        invoiceTotal(
          invoice
        ),
      0
    );

  const totalCollected =
    filteredPayments.reduce(
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

  const totalOutstanding =
    Math.max(
      totalBilled -
        totalCollected,
      0
    );

  const paidInvoices =
    filteredInvoices.filter(
      (invoice) =>
        invoice.status ===
        "Paid"
    ).length;

  const partialInvoices =
    filteredInvoices.filter(
      (invoice) =>
        invoice.status ===
        "Partial"
    ).length;

  const pendingInvoices =
    filteredInvoices.filter(
      (invoice) =>
        invoice.status ===
        "Pending"
    ).length;

  const overdueInvoices =
    filteredInvoices.filter(
      (invoice) =>
        invoice.status ===
        "Overdue"
    ).length;

  const collectionRate =
    totalBilled > 0
      ? (totalCollected /
          totalBilled) *
        100
      : 0;

  /*
  ==========================================
  MONTHLY COLLECTION
  ==========================================
  */

  const monthlyPayments =
    useMemo<
      MonthlyPayment[]
    >(() => {
      const map: Record<
        string,
        number
      > = {};

      filteredPayments.forEach(
        (payment) => {
          if (
            !payment.payment_date
          ) {
            return;
          }

          const key =
            payment.payment_date.slice(
              0,
              7
            );

          map[key] =
            (map[key] ?? 0) +
            Number(
              payment.amount
            );
        }
      );

      return Object.entries(
        map
      )
        .sort(
          ([a], [b]) =>
            a.localeCompare(b)
        )
        .map(
          ([
            key,
            amount,
          ]) => {
            const date =
              new Date(
                `${key}-01T00:00:00`
              );

            return {
              key,

              label:
                date.toLocaleDateString(
                  "en-US",
                  {
                    month:
                      "short",

                    year:
                      "numeric",
                  }
                ),

              amount,
            };
          }
        );
    }, [filteredPayments]);

  /*
  ==========================================
  FORMATTING
  ==========================================
  */

  function formatMoney(
    value: number
  ) {
    return `Rs. ${Number(
      value
    ).toLocaleString()}`;
  }

  function formatDateLabel(
    value: string
  ) {
    if (!value) {
      return "";
    }

    return new Date(
      `${value}T00:00:00`
    ).toLocaleDateString(
      "en-US",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  const dateRangeLabel =
    invalidDateRange
      ? "Invalid date range"
      : fromDate && toDate
        ? `${formatDateLabel(
            fromDate
          )} - ${formatDateLabel(
            toDate
          )}`
        : fromDate
          ? `From ${formatDateLabel(
              fromDate
            )}`
          : toDate
            ? `Up to ${formatDateLabel(
                toDate
              )}`
            : "All-time data";

  /*
  ==========================================
  RESET FILTER
  ==========================================
  */

  function resetFilters() {
    setFromDate("");
    setToDate("");
  }

  /*
  ==========================================
  CSV EXPORT
  ==========================================
  */

  function exportCsv() {
    if (
      invalidDateRange
    ) {
      return;
    }

    const rows: (
      | string
      | number
    )[][] = [
      [
        "SchoolIQ Reports & Analytics",
      ],

      [
        "Generated",
        new Date().toLocaleString(),
      ],

      [
        "Date Range",
        dateRangeLabel,
      ],

      [],

      [
        "STUDENT SUMMARY",
      ],

      [
        "Metric",
        "Value",
      ],

      [
        "Total Students",
        totalStudents,
      ],

      [
        "Active Students",
        activeStudents,
      ],

      [],

      [
        "ATTENDANCE SUMMARY",
      ],

      [
        "Metric",
        "Value",
      ],

      [
        "Attendance Records",
        filteredAttendance.length,
      ],

      [
        "Present",
        presentCount,
      ],

      [
        "Absent",
        absentCount,
      ],

      [
        "Late",
        lateCount,
      ],

      [
        "Leave",
        leaveCount,
      ],

      [
        "Attendance Rate",
        `${attendancePercentage.toFixed(
          1
        )}%`,
      ],

      [],

      [
        "FEE SUMMARY",
      ],

      [
        "Metric",
        "Value",
      ],

      [
        "Total Billed",
        totalBilled,
      ],

      [
        "Total Collected",
        totalCollected,
      ],

      [
        "Outstanding",
        totalOutstanding,
      ],

      [
        "Collection Rate",
        `${collectionRate.toFixed(
          1
        )}%`,
      ],

      [],

      [
        "INVOICE STATUS",
      ],

      [
        "Status",
        "Count",
      ],

      [
        "Paid",
        paidInvoices,
      ],

      [
        "Partial",
        partialInvoices,
      ],

      [
        "Pending",
        pendingInvoices,
      ],

      [
        "Overdue",
        overdueInvoices,
      ],

      [],

      [
        "MONTHLY FEE COLLECTION",
      ],

      [
        "Month",
        "Collected",
      ],

      ...monthlyPayments.map(
        (item) => [
          item.label,
          item.amount,
        ]
      ),
    ];

    const csvContent =
      rows
        .map((row) =>
          row
            .map((value) =>
              csvCell(value)
            )
            .join(",")
        )
        .join("\r\n");

    const blob =
      new Blob(
        [
          "\uFEFF",
          csvContent,
        ],
        {
          type: "text/csv;charset=utf-8;",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    const suffix =
      filterActive
        ? `${fromDate || "start"}_${toDate || "end"}`
        : localDateKey();

    link.href = url;

    link.download =
      `schooliq-report-${suffix}.csv`;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(
      url
    );
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

              Loading reports...
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

          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold sm:text-3xl">
                Reports &
                Analytics
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                School
                performance,
                attendance and
                financial
                overview.
              </p>
            </div>

            <button
              type="button"
              onClick={
                exportCsv
              }
              disabled={
                invalidDateRange
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <Download
                size={18}
              />

              Export CSV
            </button>
          </div>

          {/* ==================================
              ERROR
          ================================== */}

          {error && (
            <div className="mb-5 break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* ==================================
              DATE FILTER
          ================================== */}

          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <CalendarRange
                  size={20}
                />
              </div>

              <div className="min-w-0">
                <h2 className="font-bold">
                  Report Date
                  Range
                </h2>

                <p className="mt-0.5 text-sm text-slate-500">
                  Filter
                  attendance,
                  invoices and
                  payments by
                  date.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
              <div className="min-w-0">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  From Date
                </label>

                <input
                  type="date"
                  value={
                    fromDate
                  }
                  onChange={(
                    e
                  ) =>
                    setFromDate(
                      e.target
                        .value
                    )
                  }
                  className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              <div className="min-w-0">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  To Date
                </label>

                <input
                  type="date"
                  value={
                    toDate
                  }
                  onChange={(
                    e
                  ) =>
                    setToDate(
                      e.target
                        .value
                    )
                  }
                  className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={
                    resetFilters
                  }
                  disabled={
                    !filterActive
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 xl:w-auto"
                >
                  <RotateCcw
                    size={17}
                  />

                  Reset
                </button>
              </div>
            </div>

            {invalidDateRange ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                To Date cannot
                be earlier than
                From Date.
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Showing:{" "}
                <span className="font-semibold text-slate-800">
                  {
                    dateRangeLabel
                  }
                </span>
              </div>
            )}
          </div>

          {/* ==================================
              TOP KPI CARDS
          ================================== */}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Total Students"
              value={totalStudents.toString()}
              subtitle={`${activeStudents} active`}
              icon={
                <Users
                  size={21}
                />
              }
            />

            <KpiCard
              title="Attendance Rate"
              value={`${attendancePercentage.toFixed(
                1
              )}%`}
              subtitle={`${filteredAttendance.length} attendance records`}
              icon={
                <CalendarCheck
                  size={21}
                />
              }
            />

            <KpiCard
              title="Fee Collected"
              value={formatMoney(
                totalCollected
              )}
              subtitle={`${collectionRate.toFixed(
                1
              )}% collection rate`}
              icon={
                <CreditCard
                  size={21}
                />
              }
            />

            <KpiCard
              title="Outstanding Fees"
              value={formatMoney(
                totalOutstanding
              )}
              subtitle={`${
                pendingInvoices +
                partialInvoices
              } pending invoices`}
              icon={
                <WalletCards
                  size={21}
                />
              }
            />
          </div>

          {/* ==================================
              ATTENDANCE + FEES
          ================================== */}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
            {/* ATTENDANCE REPORT */}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-5 flex min-w-0 items-center gap-3 sm:mb-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <UserCheck
                    size={20}
                  />
                </div>

                <div className="min-w-0">
                  <h2 className="font-bold">
                    Attendance
                    Summary
                  </h2>

                  <p className="text-sm text-slate-500">
                    {filterActive
                      ? "Attendance within selected date range."
                      : "All recorded attendance."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <ReportStat
                  label="Present"
                  value={
                    presentCount
                  }
                />

                <ReportStat
                  label="Absent"
                  value={
                    absentCount
                  }
                />

                <ReportStat
                  label="Late"
                  value={
                    lateCount
                  }
                />

                <ReportStat
                  label="Leave"
                  value={
                    leaveCount
                  }
                />
              </div>

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500">
                    Attendance
                    Rate
                  </span>

                  <span className="shrink-0 font-semibold">
                    {attendancePercentage.toFixed(
                      1
                    )}
                    %
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{
                      width: `${Math.min(
                        attendancePercentage,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* FEE REPORT */}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-5 flex min-w-0 items-center gap-3 sm:mb-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <TrendingUp
                    size={20}
                  />
                </div>

                <div className="min-w-0">
                  <h2 className="font-bold">
                    Fee Collection
                    Summary
                  </h2>

                  <p className="text-sm text-slate-500">
                    {filterActive
                      ? "Financial activity within selected range."
                      : "Invoice and collection status."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <ReportStat
                  label="Paid"
                  value={
                    paidInvoices
                  }
                />

                <ReportStat
                  label="Partial"
                  value={
                    partialInvoices
                  }
                />

                <ReportStat
                  label="Pending"
                  value={
                    pendingInvoices
                  }
                />

                <ReportStat
                  label="Overdue"
                  value={
                    overdueInvoices
                  }
                />
              </div>

              <div className="mt-6 space-y-3">
                <MoneyRow
                  label="Total Billed"
                  value={formatMoney(
                    totalBilled
                  )}
                />

                <MoneyRow
                  label="Collected"
                  value={formatMoney(
                    totalCollected
                  )}
                />

                <MoneyRow
                  label="Outstanding"
                  value={formatMoney(
                    totalOutstanding
                  )}
                />
              </div>
            </div>
          </div>

          {/* ==================================
              MONTHLY COLLECTION
          ================================== */}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-6">
              <h2 className="font-bold">
                Monthly Fee
                Collection
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Actual payments
                received by
                month.
              </p>
            </div>

            {monthlyPayments.length ===
            0 ? (
              <p className="py-8 text-center text-sm text-slate-500 sm:py-10">
                No payment data
                available for
                this date range.
              </p>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {monthlyPayments.map(
                  (item) => (
                    <div
                      key={
                        item.key
                      }
                      className="flex flex-col gap-1 rounded-xl bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                    >
                      <span className="font-medium">
                        {
                          item.label
                        }
                      </span>

                      <span className="break-words font-bold text-emerald-600">
                        {formatMoney(
                          item.amount
                        )}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
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

function KpiCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
        {icon}
      </div>

      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-1 break-words text-xl font-bold sm:text-2xl">
        {value}
      </p>

      <p className="mt-2 break-words text-xs text-slate-400">
        {subtitle}
      </p>
    </div>
  );
}

/*
==========================================
REPORT STAT
==========================================
*/

function ReportStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 p-3 sm:p-4">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

/*
==========================================
MONEY ROW
==========================================
*/

function MoneyRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="break-words font-semibold sm:text-right">
        {value}
      </span>
    </div>
  );
}