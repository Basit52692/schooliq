"use client";

import {

  useEffect,

  useMemo,

  useState,

} from "react";

import Link from "next/link";

import {

  Banknote,

  CheckCircle2,

  CircleDollarSign,

  Clock3,

  History,

  Loader2,

  Plus,

  ReceiptText,

  Search,

  WalletCards,

  X,

} from "lucide-react";

import Sidebar from "@/components/Sidebar";

import Navbar from "@/components/Navbar";

import { createClient } from "@/lib/supabase/client";

type Role =

  | "school_admin"

  | "super_admin"

  | "teacher"

  | "accountant";

type InvoiceStatus =

  | "Pending"

  | "Partial"

  | "Paid"

  | "Overdue";

type FeeStudent = {

  id: string;

  admission_no: string;

  student_name: string;

  class_id: string;

  section_id: string;

  class_label: string;

  section_label: string;

};

type Invoice = {

  id: string;

  school_id: string;

  student_id: string;

  fee_month: string;

  due_date: string | null;

  amount: number;

  discount: number;

  fine: number;

  paid_amount: number;

  status: InvoiceStatus;

  notes: string | null;

  created_at: string;

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

function currentMonth() {

  const now =

    new Date();

  const year =

    now.getFullYear();

  const month = String(

    now.getMonth() + 1

  ).padStart(2, "0");

  return `${year}-${month}`;

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

export default function FeesPage() {

  const [role, setRole] =

    useState<Role | null>(null);

  const [schoolId, setSchoolId] =

    useState("");

  const [students, setStudents] =

    useState<FeeStudent[]>([]);

  const [invoices, setInvoices] =

    useState<Invoice[]>([]);

  const [loading, setLoading] =

    useState(true);

  const [error, setError] =

    useState("");

  const [search, setSearch] =

    useState("");

  const [

    statusFilter,

    setStatusFilter,

  ] = useState<

    "All" | InvoiceStatus

  >("All");

  /*

  ==========================================

  CREATE INVOICE

  ==========================================

  */

  const [

    showInvoiceModal,

    setShowInvoiceModal,

  ] = useState(false);

  const [

    invoiceSaving,

    setInvoiceSaving,

  ] = useState(false);

  const [

    studentId,

    setStudentId,

  ] = useState("");

  const [

    feeMonth,

    setFeeMonth,

  ] = useState(

    currentMonth()

  );

  const [

    dueDate,

    setDueDate,

  ] = useState(

    localDate()

  );

  const [

    amount,

    setAmount,

  ] = useState("");

  const [

    discount,

    setDiscount,

  ] = useState("0");

  const [fine, setFine] =

    useState("0");

  const [

    invoiceNotes,

    setInvoiceNotes,

  ] = useState("");

  /*

  ==========================================

  PAYMENT

  ==========================================

  */

  const [

    paymentInvoice,

    setPaymentInvoice,

  ] = useState<Invoice | null>(

    null

  );

  const [

    paymentAmount,

    setPaymentAmount,

  ] = useState("");

  const [

    paymentMethod,

    setPaymentMethod,

  ] = useState("Cash");

  const [

    referenceNo,

    setReferenceNo,

  ] = useState("");

  const [

    paymentNotes,

    setPaymentNotes,

  ] = useState("");

  const [

    paymentSaving,

    setPaymentSaving,

  ] = useState(false);

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

      .select(

        "school_id, role"

      )

      .eq("id", user.id)

      .single();

    if (

      profileError ||

      !profile

    ) {

      setError(

        profileError?.message ??

          "Unable to load user profile."

      );

      setLoading(false);

      return;

    }

    setRole(

      profile.role as Role

    );

    setSchoolId(

      profile.school_id

    );

    /*

    ------------------------------------------

    OVERDUE REFRESH

    ------------------------------------------

    */

    const {

      error:

        overdueError,

    } =

      await supabase.rpc(

        "refresh_overdue_invoices"

      );

    if (

      overdueError

    ) {

      console.error(

        overdueError

      );

    }

    await Promise.all([

      loadStudents(),

      loadInvoices(),

    ]);

    setLoading(false);

  }

  /*

  ==========================================

  LOAD STUDENTS

  ==========================================

  */

  async function loadStudents() {

    const supabase =

      createClient();

    /*

      New RPC returns:

      class_id

      section_id

      class_label

      section_label

      No class_name / section dependency.

    */

    const {

      data,

      error,

    } =

      await supabase.rpc(

        "get_fee_students"

      );

    if (error) {

      setError(

        error.message

      );

      return;

    }

    setStudents(

      (data ??

        []) as FeeStudent[]

    );

  }

  /*

  ==========================================

  LOAD INVOICES

  ==========================================

  */

  async function loadInvoices() {

    const supabase =

      createClient();

    const {

      data,

      error,

    } = await supabase

      .from("fee_invoices")

      .select(`

        id,

        school_id,

        student_id,

        fee_month,

        due_date,

        amount,

        discount,

        fine,

        paid_amount,

        status,

        notes,

        created_at

      `)

      .order(

        "created_at",

        {

          ascending: false,

        }

      );

    if (error) {

      setError(

        error.message

      );

      return;

    }

    setInvoices(

      (data ?? []).map(

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

  }

  /*

  ==========================================

  STUDENT LOOKUP

  ==========================================

  */

  function getStudent(

    id: string

  ) {

    return students.find(

      (student) =>

        student.id === id

    );

  }

  /*

  ==========================================

  TOTALS

  ==========================================

  */

  function invoiceTotal(

    invoice: Invoice

  ) {

    return Math.max(

      0,

      invoice.amount -

        invoice.discount +

        invoice.fine

    );

  }

  function outstanding(

    invoice: Invoice

  ) {

    return Math.max(

      0,

      invoiceTotal(

        invoice

      ) -

        invoice.paid_amount

    );

  }

  /*

  ==========================================

  FILTER

  ==========================================

  */

  const filteredInvoices =

    useMemo(() => {

      const query =

        search

          .trim()

          .toLowerCase();

      return invoices.filter(

        (invoice) => {

          const student =

            getStudent(

              invoice.student_id

            );

          const matchesStatus =

            statusFilter ===

              "All" ||

            invoice.status ===

              statusFilter;

          const matchesSearch =

            !query ||

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

            invoice.status

              .toLowerCase()

              .includes(

                query

              );

          return (

            matchesStatus &&

            matchesSearch

          );

        }

      );

    }, [

      invoices,

      students,

      search,

      statusFilter,

    ]);

  /*

  ==========================================

  SUMMARY

  ==========================================

  */

  const totalInvoiced =

    invoices.reduce(

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

    invoices.reduce(

      (

        sum,

        invoice

      ) =>

        sum +

        invoice.paid_amount,

      0

    );

  const totalOutstanding =

    invoices.reduce(

      (

        sum,

        invoice

      ) =>

        sum +

        outstanding(

          invoice

        ),

      0

    );

  const overdueCount =

    invoices.filter(

      (invoice) =>

        invoice.status ===

        "Overdue"

    ).length;

  /*

  ==========================================

  CREATE INVOICE

  ==========================================

  */

  async function createInvoice() {

    setError("");

    if (!studentId) {

      setError(

        "Please select a student."

      );

      return;

    }

    const numericAmount =

      Number(amount);

    const numericDiscount =

      Number(

        discount || 0

      );

    const numericFine =

      Number(

        fine || 0

      );

    if (

      !numericAmount ||

      numericAmount <= 0

    ) {

      setError(

        "Fee amount must be greater than zero."

      );

      return;

    }

    if (

      numericDiscount < 0 ||

      numericFine < 0

    ) {

      setError(

        "Discount and fine cannot be negative."

      );

      return;

    }

    if (

      numericDiscount >

      numericAmount +

        numericFine

    ) {

      setError(

        "Discount cannot exceed payable fee."

      );

      return;

    }

    setInvoiceSaving(true);

    const supabase =

      createClient();

    const feeMonthDate =

      `${feeMonth}-01`;

    const {
  error: insertError,
} = await supabase.rpc(
  "create_fee_invoice",
  {
    p_student_id:
      studentId,

    p_fee_month:
      feeMonthDate,

    p_amount:
      numericAmount,

    p_due_date:
      dueDate || null,

    p_discount:
      numericDiscount,

    p_fine:
      numericFine,

    p_notes:
      invoiceNotes.trim() ||
      null,
  }
);

    if (insertError) {

      if (

        insertError.code ===

        "23505"

      ) {

        setError(

          "This student already has an invoice for the selected month."

        );

      } else {

        setError(

          insertError.message

        );

      }

      setInvoiceSaving(

        false

      );

      return;

    }

    resetInvoiceForm();

    setShowInvoiceModal(

      false

    );

    await loadInvoices();

    setInvoiceSaving(false);

  }

  function resetInvoiceForm() {

    setStudentId("");

    setFeeMonth(

      currentMonth()

    );

    setDueDate(

      localDate()

    );

    setAmount("");

    setDiscount("0");

    setFine("0");

    setInvoiceNotes("");

  }

  /*

  ==========================================

  PAYMENT MODAL

  ==========================================

  */

  function openPayment(

    invoice: Invoice

  ) {

    const balance =

      outstanding(

        invoice

      );

    setPaymentInvoice(

      invoice

    );

    setPaymentAmount(

      String(balance)

    );

    setPaymentMethod(

      "Cash"

    );

    setReferenceNo("");

    setPaymentNotes("");

  }

  /*

  ==========================================

  RECORD PAYMENT

  ==========================================

  */

  async function recordPayment() {

    if (

      !paymentInvoice

    ) {

      return;

    }

    setError("");

    const numericAmount =

      Number(

        paymentAmount

      );

    if (

      !numericAmount ||

      numericAmount <= 0

    ) {

      setError(

        "Payment amount must be greater than zero."

      );

      return;

    }

    const balance =

      outstanding(

        paymentInvoice

      );

    if (

      numericAmount >

      balance

    ) {

      setError(

        `Payment cannot exceed ${money(

          balance

        )}.`

      );

      return;

    }

    setPaymentSaving(true);

    const supabase =

      createClient();

    const {

      error:

        paymentError,

    } =

      await supabase.rpc(

        "record_fee_payment",

        {

          p_invoice_id:

            paymentInvoice.id,

          p_amount:

            numericAmount,

          p_payment_method:

            paymentMethod,

          p_reference_no:

            referenceNo.trim() ||

            null,

          p_notes:

            paymentNotes.trim() ||

            null,

        }

      );

    if (

      paymentError

    ) {

      setError(

        paymentError.message

      );

      setPaymentSaving(

        false

      );

      return;

    }

    setPaymentInvoice(

      null

    );

    await supabase.rpc(

      "refresh_overdue_invoices"

    );

    await loadInvoices();

    setPaymentSaving(false);

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

          {/* HEADER */}

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h1 className="text-2xl font-bold sm:text-3xl">

                Fees & Payments

              </h1>

              <p className="mt-1 text-sm text-slate-500">

                Manage fee invoices,

                outstanding balances

                and payments.

              </p>

            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">

              <Link

                href="/fees/history"

                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold transition hover:bg-slate-50 sm:w-auto"

              >

                <History

                  size={17}

                />

                Payment History

              </Link>

              {(role ===

                "school_admin" ||

                role ===

                  "accountant") && (

                <button

                  onClick={() =>

                    setShowInvoiceModal(

                      true

                    )

                  }

                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"

                >

                  <Plus

                    size={17}

                  />

                  New Invoice

                </button>

              )}

            </div>

          </div>

          {/* ERROR */}

          {error && (

            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">

              {error}

            </div>

          )}

          {/* SUMMARY */}

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">

            <SummaryCard

              title="Total Invoiced"

              value={money(

                totalInvoiced

              )}

              icon={

                <ReceiptText

                  size={20}

                />

              }

            />

            <SummaryCard

              title="Collected"

              value={money(

                totalCollected

              )}

              icon={

                <CheckCircle2

                  size={20}

                />

              }

            />

            <SummaryCard

              title="Outstanding"

              value={money(

                totalOutstanding

              )}

              icon={

                <WalletCards

                  size={20}

                />

              }

            />

            <SummaryCard

              title="Overdue Invoices"

              value={String(

                overdueCount

              )}

              icon={

                <Clock3

                  size={20}

                />

              }

            />

          </div>

          {/* FILTERS */}

          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

              <div className="flex w-full min-w-0 max-w-xl flex-1 items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 sm:px-4">

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

                  placeholder="Search student, admission no or class..."

                  className="min-w-0 w-full bg-transparent text-sm outline-none"

                />

              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">

                {[

                  "All",

                  "Pending",

                  "Partial",

                  "Overdue",

                  "Paid",

                ].map(

                  (item) => (

                    <button

                      key={item}

                      onClick={() =>

                        setStatusFilter(

                          item as

                            | "All"

                            | InvoiceStatus

                        )

                      }

                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${

                        statusFilter ===

                        item

                          ? "bg-blue-600 text-white"

                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"

                      }`}

                    >

                      {item}

                    </button>

                  )

                )}

              </div>

            </div>

          </div>

          {/* TABLE */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            {loading ? (

              <div className="flex min-h-72 items-center justify-center">

                <div className="flex items-center gap-3 text-slate-500">

                  <Loader2 className="animate-spin" />

                  Loading fee invoices...

                </div>

              </div>

            ) : filteredInvoices.length ===

              0 ? (

              <div className="p-6 text-center sm:p-12">

                <CircleDollarSign

                  size={46}

                  className="mx-auto mb-4 text-slate-300"

                />

                <h2 className="font-semibold">

                  No invoices found

                </h2>

                <p className="mt-1 text-sm text-slate-500">

                  Create a fee invoice

                  or change your

                  filters.

                </p>

              </div>

            ) : (

              <div className="overflow-x-auto">

                <table className="w-full min-w-[1080px] text-sm">

                  <thead>

                    <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">

                        Student

                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">

                        Month

                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">

                        Due Date

                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">

                        Payable

                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">

                        Paid

                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">

                        Outstanding

                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">

                        Status

                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">

                        Action

                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {filteredInvoices.map(

                      (invoice) => {

                        const student =

                          getStudent(

                            invoice.student_id

                          );

                        const balance =

                          outstanding(

                            invoice

                          );

                        return (

                          <tr

                            key={

                              invoice.id

                            }

                            className="border-b border-slate-100 last:border-none"

                          >

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

                                invoice.fee_month

                              )}

                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-slate-600 sm:px-5">

                              {formatDate(

                                invoice.due_date

                              )}

                            </td>

                            <td className="whitespace-nowrap px-4 py-4 font-semibold sm:px-5">

                              {money(

                                invoiceTotal(

                                  invoice

                                )

                              )}

                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-emerald-600 sm:px-5">

                              {money(

                                invoice.paid_amount

                              )}

                            </td>

                            <td className="whitespace-nowrap px-4 py-4 font-semibold sm:px-5">

                              {money(

                                balance

                              )}

                            </td>

                            <td className="px-4 py-4 sm:px-5">

                              <StatusBadge

                                status={

                                  invoice.status

                                }

                              />

                            </td>

                            <td className="px-4 py-4 sm:px-5">

                              {balance >

                              0 ? (

                                <button

                                  onClick={() =>

                                    openPayment(

                                      invoice

                                    )

                                  }

                                  className="flex whitespace-nowrap items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"

                                >

                                  <Banknote

                                    size={15}

                                  />

                                  Pay

                                </button>

                              ) : (

                                <span className="text-xs font-semibold text-emerald-600">

                                  Fully Paid

                                </span>

                              )}

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

      {/* CREATE INVOICE MODAL */}

      {showInvoiceModal && (

        <Modal

          title="Create Fee Invoice"

          onClose={() => {

            setShowInvoiceModal(

              false

            );

            resetInvoiceForm();

          }}

        >

          <div className="space-y-4">

            <Field label="Student">

              <select

                value={studentId}

                onChange={(e) =>

                  setStudentId(

                    e.target.value

                  )

                }

                className="input"

              >

                <option value="">

                  Select student

                </option>

                {students.map(

                  (student) => (

                    <option

                      key={

                        student.id

                      }

                      value={

                        student.id

                      }

                    >

                      {student.admission_no}

                      {" — "}

                      {student.student_name}

                      {" ("}

                      {student.class_label}

                      {"-"}

                      {student.section_label}

                      {")"}

                    </option>

                  )

                )}

              </select>

            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <Field label="Fee Month">

                <input

                  type="month"

                  value={

                    feeMonth

                  }

                  onChange={(e) =>

                    setFeeMonth(

                      e.target.value

                    )

                  }

                  className="input"

                />

              </Field>

              <Field label="Due Date">

                <input

                  type="date"

                  value={

                    dueDate

                  }

                  onChange={(e) =>

                    setDueDate(

                      e.target.value

                    )

                  }

                  className="input"

                />

              </Field>

            </div>

            <Field label="Fee Amount">

              <input

                type="number"

                min="0"

                value={amount}

                onChange={(e) =>

                  setAmount(

                    e.target.value

                  )

                }

                placeholder="5000"

                className="input"

              />

            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <Field label="Discount">

                <input

                  type="number"

                  min="0"

                  value={

                    discount

                  }

                  onChange={(e) =>

                    setDiscount(

                      e.target.value

                    )

                  }

                  className="input"

                />

              </Field>

              <Field label="Fine">

                <input

                  type="number"

                  min="0"

                  value={fine}

                  onChange={(e) =>

                    setFine(

                      e.target.value

                    )

                  }

                  className="input"

                />

              </Field>

            </div>

            <Field label="Notes">

              <textarea

                value={

                  invoiceNotes

                }

                onChange={(e) =>

                  setInvoiceNotes(

                    e.target.value

                  )

                }

                rows={3}

                placeholder="Optional notes..."

                className="input resize-none"

              />

            </Field>

            <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">

              <button

                onClick={() =>

                  setShowInvoiceModal(

                    false

                  )

                }

                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold sm:w-auto"

              >

                Cancel

              </button>

              <button

                onClick={

                  createInvoice

                }

                disabled={

                  invoiceSaving

                }

                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"

              >

                {invoiceSaving && (

                  <Loader2

                    size={16}

                    className="animate-spin"

                  />

                )}

                Create Invoice

              </button>

            </div>

          </div>

        </Modal>

      )}

      {/* PAYMENT MODAL */}

      {paymentInvoice && (

        <Modal

          title="Record Payment"

          onClose={() =>

            setPaymentInvoice(

              null

            )

          }

        >

          <div className="space-y-4">

            <div className="rounded-xl bg-slate-50 p-4">

              <p className="text-xs text-slate-500">

                Outstanding Balance

              </p>

              <p className="mt-1 text-2xl font-bold">

                {money(

                  outstanding(

                    paymentInvoice

                  )

                )}

              </p>

            </div>

            <Field label="Payment Amount">

              <input

                type="number"

                min="1"

                max={outstanding(

                  paymentInvoice

                )}

                value={

                  paymentAmount

                }

                onChange={(e) =>

                  setPaymentAmount(

                    e.target.value

                  )

                }

                className="input"

              />

            </Field>

            <Field label="Payment Method">

              <select

                value={

                  paymentMethod

                }

                onChange={(e) =>

                  setPaymentMethod(

                    e.target.value

                  )

                }

                className="input"

              >

                <option>

                  Cash

                </option>

                <option>

                  Bank Transfer

                </option>

                <option>

                  Card

                </option>

                <option>

                  Online

                </option>

              </select>

            </Field>

            <Field label="Reference No.">

              <input

                value={

                  referenceNo

                }

                onChange={(e) =>

                  setReferenceNo(

                    e.target.value

                  )

                }

                placeholder="Optional"

                className="input"

              />

            </Field>

            <Field label="Notes">

              <textarea

                value={

                  paymentNotes

                }

                onChange={(e) =>

                  setPaymentNotes(

                    e.target.value

                  )

                }

                rows={3}

                placeholder="Optional notes..."

                className="input resize-none"

              />

            </Field>

            <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">

              <button

                onClick={() =>

                  setPaymentInvoice(

                    null

                  )

                }

                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold sm:w-auto"

              >

                Cancel

              </button>

              <button

                onClick={

                  recordPayment

                }

                disabled={

                  paymentSaving

                }

                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"

              >

                {paymentSaving && (

                  <Loader2

                    size={16}

                    className="animate-spin"

                  />

                )}

                Record Payment

              </button>

            </div>

          </div>

        </Modal>

      )}

      <style jsx global>{`

        .input {

          width: 100%;

          border: 1px solid rgb(226 232 240);

          border-radius: 0.75rem;

          padding: 0.75rem 1rem;

          font-size: 0.875rem;

          outline: none;

          background: white;

        }

        .input:focus {

          border-color: rgb(59 130 246);

          box-shadow: 0 0 0 2px

            rgb(59 130 246 / 0.08);

        }

      `}</style>

    </main>

  );

}

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

function StatusBadge({

  status,

}: {

  status: InvoiceStatus;

}) {

  const styles: Record<

    InvoiceStatus,

    string

  > = {

    Pending:

      "bg-slate-100 text-slate-600",

    Partial:

      "bg-blue-50 text-blue-600",

    Paid:

      "bg-emerald-50 text-emerald-600",

    Overdue:

      "bg-red-50 text-red-600",

  };

  return (

    <span

      className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}

    >

      {status}

    </span>

  );

}

function Field({

  label,

  children,

}: {

  label: string;

  children: React.ReactNode;

}) {

  return (

    <div>

      <label className="mb-2 block text-sm font-medium text-slate-700">

        {label}

      </label>

      {children}

    </div>

  );

}

function Modal({

  title,

  children,

  onClose,

}: {

  title: string;

  children: React.ReactNode;

  onClose: () => void;

}) {

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 sm:p-4">

      <div className="max-h-[calc(100vh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100vh-2rem)]">

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-4 sm:px-6 sm:py-5">

          <h2 className="text-lg font-bold">

            {title}

          </h2>

          <button

            onClick={onClose}

            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"

          >

            <X size={19} />

          </button>

        </div>

        <div className="p-4 sm:p-6">

          {children}

        </div>

      </div>

    </div>

  );

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

  value: string

) {

  const date =

    new Date(

      `${value}T00:00:00`

    );

  return date.toLocaleDateString(

    "en-GB",

    {

      month: "short",

      year: "numeric",

    }

  );

}