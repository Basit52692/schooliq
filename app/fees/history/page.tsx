"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  ArrowLeft,
  Banknote,
  CreditCard,
  History,
  Loader2,
  Printer,
  ReceiptText,
  Search,
  WalletCards,
  X,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";

type PaymentMethod =
  | "Cash"
  | "Bank Transfer"
  | "Card"
  | "Online";

type FeeStudent = {
  id: string;
  admission_no: string;
  student_name: string;

  class_id: string;
  section_id: string;

  class_label: string;
  section_label: string;
};

type FeeInvoice = {
  id: string;
  fee_month: string;
  due_date: string | null;

  amount: number;
  discount: number;
  fine: number;
};

type FeePayment = {
  id: string;

  invoice_id: string;
  student_id: string;

  receipt_no: number;

  amount: number;

  payment_date: string;

  payment_method: PaymentMethod;

  reference_no: string | null;
  notes: string | null;

  created_at: string;
};

type PaymentRow = FeePayment & {
  student?: FeeStudent;
  invoice?: FeeInvoice;
};

type School = {
  name: string;
  code: string | null;
};

function localDate() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function money(
  value: number
) {
  return new Intl.NumberFormat(
    "en-PK",
    {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }
  ).format(value);
}

function formatReceiptNo(
  receiptNo: number
) {
  return `RCP-${String(
    receiptNo
  ).padStart(6, "0")}`;
}

function formatDate(
  value: string | null
) {
  if (!value) return "—";

  const date =
    new Date(
      `${value}T00:00:00`
    );

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatMonth(
  value: string | null
) {
  if (!value) return "—";

  const date =
    new Date(
      `${value}T00:00:00`
    );

  return date.toLocaleDateString(
    "en-GB",
    {
      month: "long",
      year: "numeric",
    }
  );
}

export default function PaymentHistoryPage() {
  const [
    payments,
    setPayments,
  ] = useState<PaymentRow[]>([]);

  const [
    school,
    setSchool,
  ] = useState<School | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    selectedDate,
    setSelectedDate,
  ] = useState("");

  const [
    methodFilter,
    setMethodFilter,
  ] = useState<
    "All" | PaymentMethod
  >("All");

  const [
    selectedReceipt,
    setSelectedReceipt,
  ] = useState<PaymentRow | null>(
    null
  );

  /*
  ==========================================
  INITIAL LOAD
  ==========================================
  */

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setError("");

    const supabase =
      createClient();

    /*
    ------------------------------------------
    USER
    ------------------------------------------
    */

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      setError(
        "Unable to load logged-in user."
      );

      setLoading(false);
      return;
    }

    /*
    ------------------------------------------
    PROFILE
    ------------------------------------------
    */

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile
    ) {
      setError(
        profileError?.message ??
          "Unable to load profile."
      );

      setLoading(false);
      return;
    }

    /*
    ------------------------------------------
    SCHOOL
    ------------------------------------------
    */

    const {
      data: schoolData,
      error: schoolError,
    } = await supabase
      .from("schools")
      .select("name, code")
      .eq(
        "id",
        profile.school_id
      )
      .single();

    if (schoolError) {
      console.error(
        schoolError
      );
    }

    if (schoolData) {
      setSchool(
        schoolData as School
      );
    }

    /*
    ------------------------------------------
    STUDENTS

    New RPC:
    class_id
    section_id
    class_label
    section_label

    No class_name / section dependency.
    ------------------------------------------
    */

    const {
      data: studentData,
      error: studentError,
    } =
      await supabase.rpc(
        "get_fee_students"
      );

    if (studentError) {
      setError(
        studentError.message
      );

      setLoading(false);
      return;
    }

    const students =
      (studentData ??
        []) as FeeStudent[];

    /*
    ------------------------------------------
    INVOICES
    ------------------------------------------
    */

    const {
      data: invoiceData,
      error: invoiceError,
    } = await supabase
      .from("fee_invoices")
      .select(`
        id,
        fee_month,
        due_date,
        amount,
        discount,
        fine
      `);

    if (invoiceError) {
      setError(
        invoiceError.message
      );

      setLoading(false);
      return;
    }

    const invoices =
      (invoiceData ??
        []).map(
        (item) => ({
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
        })
      ) as FeeInvoice[];

    /*
    ------------------------------------------
    PAYMENTS
    ------------------------------------------
    */

    const {
      data: paymentData,
      error: paymentError,
    } = await supabase
      .from("fee_payments")
      .select(`
        id,
        invoice_id,
        student_id,
        receipt_no,
        amount,
        payment_date,
        payment_method,
        reference_no,
        notes,
        created_at
      `)
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (paymentError) {
      setError(
        paymentError.message
      );

      setLoading(false);
      return;
    }

    /*
    ------------------------------------------
    MAP RELATIONS
    ------------------------------------------
    */

    const studentMap =
      new Map(
        students.map(
          (student) => [
            student.id,
            student,
          ]
        )
      );

    const invoiceMap =
      new Map(
        invoices.map(
          (invoice) => [
            invoice.id,
            invoice,
          ]
        )
      );

    const rows =
      (paymentData ??
        []).map(
        (payment) => ({
          ...payment,

          receipt_no:
            Number(
              payment.receipt_no
            ),

          amount:
            Number(
              payment.amount
            ) || 0,

          student:
            studentMap.get(
              payment.student_id
            ),

          invoice:
            invoiceMap.get(
              payment.invoice_id
            ),
        })
      ) as PaymentRow[];

    setPayments(rows);

    setLoading(false);
  }

  /*
  ==========================================
  FILTER
  ==========================================
  */

  const filteredPayments =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return payments.filter(
        (payment) => {
          const student =
            payment.student;

          const receipt =
            formatReceiptNo(
              payment.receipt_no
            ).toLowerCase();

          const matchesSearch =
            !query ||
            receipt.includes(
              query
            ) ||
            student?.student_name
              .toLowerCase()
              .includes(
                query
              ) ||
            student?.admission_no
              .toLowerCase()
              .includes(
                query
              ) ||
            student?.class_label
              .toLowerCase()
              .includes(
                query
              ) ||
            student?.section_label
              .toLowerCase()
              .includes(
                query
              ) ||
            payment.reference_no
              ?.toLowerCase()
              .includes(
                query
              );

          const matchesDate =
            !selectedDate ||
            payment.payment_date ===
              selectedDate;

          const matchesMethod =
            methodFilter ===
              "All" ||
            payment.payment_method ===
              methodFilter;

          return (
            matchesSearch &&
            matchesDate &&
            matchesMethod
          );
        }
      );
    }, [
      payments,
      search,
      selectedDate,
      methodFilter,
    ]);

  /*
  ==========================================
  SUMMARY
  ==========================================
  */

  const totalCollected =
    filteredPayments.reduce(
      (
        sum,
        payment
      ) =>
        sum +
        payment.amount,
      0
    );

  const todayCollected =
    payments
      .filter(
        (payment) =>
          payment.payment_date ===
          localDate()
      )
      .reduce(
        (
          sum,
          payment
        ) =>
          sum +
          payment.amount,
        0
      );

  /*
  ==========================================
  PRINT
  ==========================================
  */

  function printReceipt() {
    window.print();
  }

  /*
  ==========================================
  UI
  ==========================================
  */

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="no-print">
        <Sidebar />
      </div>

      <section className="ml-64 min-h-screen print:ml-0">
        <div className="no-print">
          <Navbar />
        </div>

        <div className="p-4 sm:p-5 lg:p-7 no-print">
          {/* BACK */}

          <Link
            href="/fees"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600"
          >
            <ArrowLeft
              size={17}
            />

            Back to Fees
          </Link>

          {/* HEADER */}

          <div className="mb-6">
            <h1 className="text-2xl font-bold sm:text-3xl">
              Payment History
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              View payments and print
              professional fee receipts.
            </p>
          </div>

          {/* ERROR */}

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* SUMMARY */}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
              title="Transactions"
              value={String(
                filteredPayments.length
              )}
              icon={
                <History
                  size={20}
                />
              }
            />

            <SummaryCard
              title="Filtered Collection"
              value={money(
                totalCollected
              )}
              icon={
                <WalletCards
                  size={20}
                />
              }
            />

            <SummaryCard
              title="Collected Today"
              value={money(
                todayCollected
              )}
              icon={
                <Banknote
                  size={20}
                />
              }
            />
          </div>

          {/* FILTERS */}

          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {/* SEARCH */}

              <div className="min-w-0 md:col-span-2 xl:col-span-1">
                <label className="mb-2 block text-sm font-medium">
                  Search
                </label>

                <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 sm:px-4">
                  <Search
                    size={18}
                    className="shrink-0 text-slate-400"
                  />

                  <input
                    value={search}
                    onChange={(e) =>
                      setSearch(
                        e.target.value
                      )
                    }
                    placeholder="Student, class, receipt, reference..."
                    className="min-w-0 w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>

              {/* DATE */}

              <div className="min-w-0">
                <label className="mb-2 block text-sm font-medium">
                  Payment Date
                </label>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="date"
                    value={
                      selectedDate
                    }
                    onChange={(e) =>
                      setSelectedDate(
                        e.target.value
                      )
                    }
                    className="min-w-0 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />

                  {selectedDate && (
                    <button
                      onClick={() =>
                        setSelectedDate(
                          ""
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold sm:w-auto"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* METHOD */}

              <div className="min-w-0">
                <label className="mb-2 block text-sm font-medium">
                  Payment Method
                </label>

                <select
                  value={
                    methodFilter
                  }
                  onChange={(e) =>
                    setMethodFilter(
                      e.target.value as
                        | "All"
                        | PaymentMethod
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="All">
                    All Methods
                  </option>

                  <option value="Cash">
                    Cash
                  </option>

                  <option value="Bank Transfer">
                    Bank Transfer
                  </option>

                  <option value="Card">
                    Card
                  </option>

                  <option value="Online">
                    Online
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLE */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <div className="flex min-h-72 items-center justify-center p-4">
                <div className="flex items-center gap-3 text-slate-500">
                  <Loader2 className="animate-spin" />

                  Loading payment history...
                </div>
              </div>
            ) : filteredPayments.length ===
              0 ? (
              <div className="p-6 text-center sm:p-12">
                <ReceiptText
                  size={46}
                  className="mx-auto mb-4 text-slate-300"
                />

                <h2 className="font-semibold">
                  No payments found
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  No transaction matches
                  the current filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">
                        Receipt
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">
                        Student
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">
                        Fee Month
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">
                        Date
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">
                        Amount
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">
                        Method
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">
                        Reference
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredPayments.map(
                      (payment) => {
                        const student =
                          payment.student;

                        return (
                          <tr
                            key={
                              payment.id
                            }
                            className="border-b border-slate-100 last:border-none"
                          >
                            <td className="whitespace-nowrap px-4 py-4 font-semibold text-blue-600 sm:px-5">
                              {formatReceiptNo(
                                payment.receipt_no
                              )}
                            </td>

                            <td className="px-4 py-4 sm:px-5">
                              <p className="font-semibold">
                                {student?.student_name ??
                                  "Student"}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {student?.admission_no ??
                                  "—"}

                                {student
                                  ? ` • ${student.class_label}-${student.section_label}`
                                  : ""}
                              </p>
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-slate-600 sm:px-5">
                              {formatMonth(
                                payment.invoice
                                  ?.fee_month ??
                                  null
                              )}
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              {formatDate(
                                payment.payment_date
                              )}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 font-bold text-emerald-600 sm:px-5">
                              {money(
                                payment.amount
                              )}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 sm:px-5">
                              <MethodBadge
                                method={
                                  payment.payment_method
                                }
                              />
                            </td>

                            <td className="px-5 py-4 text-slate-500">
                              {payment.reference_no ??
                                "—"}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 sm:px-5">
                              <button
                                onClick={() =>
                                  setSelectedReceipt(
                                    payment
                                  )
                                }
                                className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                              >
                                <ReceiptText
                                  size={15}
                                />

                                Receipt
                              </button>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* RECEIPT MODAL */}

      {selectedReceipt && (
        <>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 sm:p-4 no-print">
            <div className="max-h-[calc(100vh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100vh-2rem)]">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
                <div>
                  <h2 className="text-lg font-bold">
                    Fee Receipt
                  </h2>

                  <p className="text-xs text-slate-500">
                    {formatReceiptNo(
                      selectedReceipt.receipt_no
                    )}
                  </p>
                </div>

                <button
                  onClick={() =>
                    setSelectedReceipt(
                      null
                    )
                  }
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="p-4 sm:p-6">
                <ReceiptContent
                  payment={
                    selectedReceipt
                  }
                  school={
                    school
                  }
                />

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    onClick={() =>
                      setSelectedReceipt(
                        null
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold sm:w-auto"
                  >
                    Close
                  </button>

                  <button
                    onClick={
                      printReceipt
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"
                  >
                    <Printer
                      size={17}
                    />

                    Print Receipt
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* PRINT ONLY */}

          <div className="receipt-print-area hidden print:block">
            <ReceiptContent
              payment={
                selectedReceipt
              }
              school={
                school
              }
            />
          </div>
        </>
      )}

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .receipt-print-area {
            display: block !important;
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            padding: 24px;
          }

          @page {
            margin: 14mm;
          }
        }
      `}</style>
    </main>
  );
}

/*
==========================================
RECEIPT
==========================================
*/

function ReceiptContent({
  payment,
  school,
}: {
  payment: PaymentRow;
  school: School | null;
}) {
  const student =
    payment.student;

  const invoice =
    payment.invoice;

  const invoiceTotal =
    invoice
      ? Math.max(
          0,
          invoice.amount -
            invoice.discount +
            invoice.fine
        )
      : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 sm:p-7">
      {/* SCHOOL */}

      <div className="border-b border-slate-200 pb-5 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
          <ReceiptText
            size={22}
          />
        </div>

        <h1 className="text-2xl font-bold">
          {school?.name ??
            "SchoolIQ"}
        </h1>

        {school?.code && (
          <p className="mt-1 text-xs text-slate-500">
            School Code:{" "}
            {school.code}
          </p>
        )}

        <p className="mt-3 text-sm font-semibold uppercase tracking-widest text-slate-500">
          Fee Payment Receipt
        </p>
      </div>

      {/* INFO */}

      <div className="grid grid-cols-1 gap-4 border-b border-slate-200 py-5 text-sm sm:grid-cols-2 sm:gap-5">
        <ReceiptItem
          label="Receipt No."
          value={formatReceiptNo(
            payment.receipt_no
          )}
        />

        <ReceiptItem
          label="Payment Date"
          value={formatDate(
            payment.payment_date
          )}
        />

        <ReceiptItem
          label="Student"
          value={
            student?.student_name ??
            "—"
          }
        />

        <ReceiptItem
          label="Admission No."
          value={
            student?.admission_no ??
            "—"
          }
        />

        <ReceiptItem
          label="Class"
          value={
            student
              ? `${student.class_label}-${student.section_label}`
              : "—"
          }
        />

        <ReceiptItem
          label="Fee Month"
          value={formatMonth(
            invoice?.fee_month ??
              null
          )}
        />
      </div>

      {/* AMOUNTS */}

      <div className="border-b border-slate-200 py-5">
        <div className="space-y-3 text-sm">
          {invoice && (
            <>
              <AmountRow
                label="Base Fee"
                value={money(
                  invoice.amount
                )}
              />

              <AmountRow
                label="Discount"
                value={
                  invoice.discount >
                  0
                    ? `- ${money(
                        invoice.discount
                      )}`
                    : money(0)
                }
              />

              <AmountRow
                label="Fine"
                value={money(
                  invoice.fine
                )}
              />

              <AmountRow
                label="Invoice Payable"
                value={money(
                  invoiceTotal
                )}
              />
            </>
          )}

          <div className="my-3 border-t border-dashed border-slate-200" />

          <div className="flex items-center justify-between">
            <span className="font-semibold">
              Amount Received
            </span>

            <span className="break-words text-xl font-bold text-emerald-600 sm:text-2xl">
              {money(
                payment.amount
              )}
            </span>
          </div>
        </div>
      </div>

      {/* PAYMENT INFO */}

      <div className="grid grid-cols-1 gap-4 py-5 text-sm sm:grid-cols-2 sm:gap-5">
        <ReceiptItem
          label="Payment Method"
          value={
            payment.payment_method
          }
        />

        <ReceiptItem
          label="Reference No."
          value={
            payment.reference_no ??
            "—"
          }
        />
      </div>

      {payment.notes && (
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Notes
          </p>

          <p className="mt-2 text-sm">
            {payment.notes}
          </p>
        </div>
      )}

      {/* FOOTER */}

      <div className="mt-8 border-t border-slate-200 pt-5 text-center">
        <p className="text-xs text-slate-500">
          This is a computer-generated receipt.
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Generated through SchoolIQ School ERP
        </p>
      </div>
    </div>
  );
}

/*
==========================================
SUMMARY
==========================================
*/

function SummaryCard({
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
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
        {icon}
      </div>

      <p className="text-xs text-slate-500">
        {title}
      </p>

      <p className="mt-1 break-words text-lg font-bold sm:text-xl">
        {value}
      </p>
    </div>
  );
}

/*
==========================================
METHOD BADGE
==========================================
*/

function MethodBadge({
  method,
}: {
  method: PaymentMethod;
}) {
  const icon =
    method === "Cash" ? (
      <Banknote size={14} />
    ) : method === "Card" ? (
      <CreditCard size={14} />
    ) : (
      <WalletCards size={14} />
    );

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
      {icon}
      {method}
    </span>
  );
}

/*
==========================================
RECEIPT ITEM
==========================================
*/

function ReceiptItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-semibold">
        {value}
      </p>
    </div>
  );
}

/*
==========================================
AMOUNT ROW
==========================================
*/

function AmountRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-slate-500">
        {label}
      </span>

      <span className="font-semibold">
        {value}
      </span>
    </div>
  );
}