import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch, ApiError } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
type PaymentTermsKey = "on_receipt" | "net_7" | "net_14" | "net_30";

const PAYMENT_TERMS: { key: PaymentTermsKey; label: string; description: string }[] = [
  { key: "on_receipt", label: "On Receipt",  description: "Due immediately" },
  { key: "net_7",      label: "Net 7",       description: "Due in 7 days" },
  { key: "net_14",     label: "Net 14",      description: "Due in 14 days" },
  { key: "net_30",     label: "Net 30",      description: "Due in 30 days" },
];

function paymentTermsLabel(key: PaymentTermsKey): string {
  return PAYMENT_TERMS.find((t) => t.key === key)?.label ?? "On Receipt";
}

interface LineItem {
  id: string;
  date: string;
  projectName: string;
  clockIn: string;
  clockOut?: string;
  minutes: number;
  rate?: number;
  subtotal?: number;
}

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  totalMinutes: number;
  hourlyRate: number;
  totalAmount: number;
  lineItems: LineItem[];
  paymentTerms: PaymentTermsKey;
  createdAt: string;
}

interface PreviewData {
  periodStart: string;
  periodEnd: string;
  totalMinutes: number;
  hourlyRate: number;
  totalAmount: number;
  lineItems: LineItem[];
}

interface GeneratedInvoice extends InvoiceRecord {
  company: {
    name: string;
    logoUrl?: string | null;
    primaryColor: string;
    businessAbn?: string | null;
    businessEmail?: string | null;
    businessAddress?: string | null;
  } | null;
  user: {
    name: string;
    email: string;
    phone?: string | null;
    abn?: string | null;
    businessAddress?: string | null;
    bankName?: string | null;
    accountName?: string | null;
    bsb?: string | null;
    accountNumber?: string | null;
    invoiceNotes?: string | null;
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isoToLocal(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function durLabel(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
function formatAud(amount: number) {
  return amount.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}

function getPeriod(preset: string): { start: string; end: string } {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  if (preset === "last_week") {
    const dayOfWeek = now.getDay();
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - dayOfWeek - 6);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    return {
      start: lastMonday.toISOString().split("T")[0],
      end: lastSunday.toISOString().split("T")[0],
    };
  }
  if (preset === "this_month") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: first.toISOString().split("T")[0], end: today };
  }
  if (preset === "last_month") {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      start: first.toISOString().split("T")[0],
      end: last.toISOString().split("T")[0],
    };
  }
  // last_fortnight
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(now.getDate() - 13);
  return { start: twoWeeksAgo.toISOString().split("T")[0], end: today };
}

// ─── PDF Template — Premium Australian Invoice ────────────────────────────────
function buildInvoiceHtml(inv: GeneratedInvoice): string {
  const primary = inv.company?.primaryColor ?? "#f97316";

  const companyName  = inv.company?.name ?? "Company";
  const subName      = inv.user?.name ?? "";
  const subEmail     = inv.user?.email ?? "";
  const subPhone     = inv.user?.phone ?? "";
  const subAbn       = inv.user?.abn ?? "";
  const subAddr      = inv.user?.businessAddress ?? "";
  const bankName     = inv.user?.bankName ?? "";
  const accountName  = inv.user?.accountName ?? "";
  const bsb          = inv.user?.bsb ?? "";
  const accountNum   = inv.user?.accountNumber ?? "";
  const notes        = inv.user?.invoiceNotes ?? "";
  const companyAbn   = inv.company?.businessAbn ?? "";
  const companyEmail = inv.company?.businessEmail ?? "";
  const companyAddr  = inv.company?.businessAddress ?? "";

  const invoiceHeading = subAbn ? "TAX INVOICE" : "INVOICE";

  const issueDate = new Date(inv.createdAt).toLocaleDateString("en-AU", {
    day: "numeric", month: "long", year: "numeric",
  });
  const periodLabel = `${fmtDate(inv.periodStart)} – ${fmtDate(inv.periodEnd)}`;
  const paymentDueLabel = paymentTermsLabel(inv.paymentTerms);

  // ── Line item rows from stored breakdown ──
  const sortedItems = [...inv.lineItems].sort((a, b) => a.date.localeCompare(b.date));
  const hourlyRate = inv.hourlyRate;
  const lineItemRows = sortedItems.map((li, idx) => {
    const hrs    = (li.minutes / 60).toFixed(2);
    const amount = (li.subtotal ?? ((li.minutes / 60) * hourlyRate)).toFixed(2);
    const timeRange = li.clockOut
      ? `${isoToLocal(li.clockIn)} – ${isoToLocal(li.clockOut)}`
      : isoToLocal(li.clockIn);
    const bg = idx % 2 === 0 ? "#ffffff" : "#f8f9fb";
    return `<tr style="background:${bg}">
      <td style="padding:10px 14px;border-bottom:1px solid #edf0f4;font-size:12px;color:#374151;white-space:nowrap">${fmtDate(li.date)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #edf0f4;font-size:12px;color:#111827;font-weight:500">${li.projectName}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #edf0f4;font-size:12px;color:#6b7280;white-space:nowrap">${timeRange}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #edf0f4;font-size:12px;color:#374151;text-align:right;white-space:nowrap">${hrs}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #edf0f4;font-size:12px;color:#111827;font-weight:600;text-align:right;white-space:nowrap">$${amount}</td>
    </tr>`;
  }).join("");

  const totalHrs = (inv.totalMinutes / 60).toFixed(2);
  const totalAmt = Number(inv.totalAmount).toFixed(2);

  // ── Payment details block ──
  const hasPayment = bankName || accountName || bsb || accountNum;
  const paymentBlock = hasPayment ? `
    <div style="margin-top:32px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <div style="width:4px;height:18px;background:${primary};border-radius:2px"></div>
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#6b7280">Payment Details</span>
      </div>
      <div style="background:#f8f9fb;border:1px solid #edf0f4;border-radius:10px;overflow:hidden">
        <table style="width:100%;border-collapse:collapse">
          ${bankName    ? `<tr><td style="padding:11px 18px;font-size:12px;font-weight:600;color:#6b7280;width:40%;border-bottom:1px solid #edf0f4">Bank</td><td style="padding:11px 18px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #edf0f4">${bankName}</td></tr>` : ""}
          ${accountName ? `<tr><td style="padding:11px 18px;font-size:12px;font-weight:600;color:#6b7280;width:40%;border-bottom:1px solid #edf0f4">Account Name</td><td style="padding:11px 18px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #edf0f4">${accountName}</td></tr>` : ""}
          ${bsb         ? `<tr><td style="padding:11px 18px;font-size:12px;font-weight:600;color:#6b7280;width:40%;border-bottom:${accountNum ? "1px solid #edf0f4" : "none"}">BSB</td><td style="padding:11px 18px;font-size:13px;font-weight:700;color:#111827;letter-spacing:0.5px;border-bottom:${accountNum ? "1px solid #edf0f4" : "none"}">${bsb}</td></tr>` : ""}
          ${accountNum  ? `<tr><td style="padding:11px 18px;font-size:12px;font-weight:600;color:#6b7280;width:40%">Account Number</td><td style="padding:11px 18px;font-size:13px;font-weight:700;color:#111827;letter-spacing:0.5px">${accountNum}</td></tr>` : ""}
        </table>
      </div>
    </div>` : "";

  // ── Notes block ──
  const notesBlock = notes ? `
    <div style="margin-top:24px;background:#fffbf5;border-left:4px solid ${primary};border-radius:0 8px 8px 0;padding:14px 18px">
      <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${primary}">Notes</span>
      <p style="margin-top:6px;font-size:13px;color:#4b5563;line-height:1.7">${notes}</p>
    </div>` : "";

  // ── Subcontractor meta lines ──
  const subMetaLines = [
    subEmail  ? `<div>${subEmail}</div>`                 : "",
    subPhone  ? `<div>${subPhone}</div>`                 : "",
    subAbn    ? `<div style="margin-top:4px;font-weight:600;color:#111827">ABN: ${subAbn}</div>` : "",
    subAddr   ? `<div style="color:#9ca3af;font-size:11px;margin-top:3px">${subAddr}</div>` : "",
  ].filter(Boolean).join("");

  const companyMetaLines = [
    companyAddr  ? `<div style="color:#9ca3af;font-size:11px;margin-top:3px">${companyAddr}</div>` : "",
    companyAbn   ? `<div style="margin-top:4px;font-weight:600;color:#111827">ABN: ${companyAbn}</div>` : "",
    companyEmail ? `<div>${companyEmail}</div>`  : "",
  ].filter(Boolean).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${invoiceHeading} ${inv.invoiceNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,Helvetica Neue,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact">

<!-- Page wrapper -->
<div style="max-width:800px;margin:0 auto;background:#ffffff;min-height:100vh">

  <!-- Top accent bar -->
  <div style="height:7px;background:${primary}"></div>

  <!-- Main content -->
  <div style="padding:44px 52px 52px">

    <!-- ── Header: Company + Invoice identity ── -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px">

      <!-- Left: Company identity -->
      <div style="max-width:55%">
        <div style="font-size:26px;font-weight:800;color:#111827;letter-spacing:-0.5px;line-height:1.2">${companyName}</div>
        <div style="margin-top:10px;font-size:12px;color:#6b7280;line-height:1.8">
          ${companyMetaLines}
        </div>
      </div>

      <!-- Right: Invoice heading + meta -->
      <div style="text-align:right">
        <div style="font-size:38px;font-weight:900;letter-spacing:-2px;color:#111827;line-height:1">${invoiceHeading}</div>
        <div style="margin-top:10px;display:inline-block;background:${primary};color:#fff;font-size:13px;font-weight:700;padding:4px 14px;border-radius:20px;letter-spacing:0.3px">${inv.invoiceNumber}</div>
        <div style="margin-top:14px;font-size:12px;color:#6b7280;line-height:2">
          <div><span style="font-weight:600;color:#374151">Date Issued</span>&nbsp;&nbsp;${issueDate}</div>
          <div><span style="font-weight:600;color:#374151">Period</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${periodLabel}</div>
          <div><span style="font-weight:600;color:#374151">Payment Due</span>&nbsp;&nbsp;${paymentDueLabel}</div>
        </div>
      </div>
    </div>

    <!-- ── Divider ── -->
    <div style="height:1.5px;background:linear-gradient(to right,${primary},${primary}33);margin-bottom:32px;border-radius:1px"></div>

    <!-- ── FROM / BILL TO ── -->
    <div style="display:flex;gap:0;margin-bottom:40px;border:1px solid #edf0f4;border-radius:12px;overflow:hidden">

      <!-- FROM: Subcontractor -->
      <div style="flex:1;padding:22px 26px;border-right:1px solid #edf0f4">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${primary};margin-bottom:10px">From</div>
        <div style="font-size:17px;font-weight:700;color:#111827;margin-bottom:6px">${subName}</div>
        <div style="font-size:12px;color:#6b7280;line-height:1.9">${subMetaLines || "&nbsp;"}</div>
      </div>

      <!-- BILL TO: Company -->
      <div style="flex:1;padding:22px 26px;background:#fafafa">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#6b7280;margin-bottom:10px">Bill To</div>
        <div style="font-size:17px;font-weight:700;color:#111827;margin-bottom:6px">${companyName}</div>
        <div style="font-size:12px;color:#6b7280;line-height:1.9">${companyMetaLines || "&nbsp;"}</div>
      </div>
    </div>

    <!-- ── Services table ── -->
    <div style="margin-bottom:0">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <div style="width:4px;height:18px;background:${primary};border-radius:2px"></div>
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#6b7280">Services Rendered &mdash; ${periodLabel}</span>
      </div>

      <div style="border:1px solid #edf0f4;border-radius:10px;overflow:hidden">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:${primary}">
              <th style="padding:12px 14px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:rgba(255,255,255,0.9)">Date</th>
              <th style="padding:12px 14px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:rgba(255,255,255,0.9)">Project / Description</th>
              <th style="padding:12px 14px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:rgba(255,255,255,0.9)">Time</th>
              <th style="padding:12px 14px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:rgba(255,255,255,0.9)">Hours</th>
              <th style="padding:12px 14px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:rgba(255,255,255,0.9)">Amount (AUD)</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemRows || `<tr><td colspan="5" style="padding:24px;text-align:center;color:#9ca3af;font-size:13px">No time entries for this period</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Totals ── -->
    <div style="display:flex;justify-content:flex-end;margin-top:20px;margin-bottom:8px">
      <div style="min-width:300px;border:1px solid #edf0f4;border-radius:12px;overflow:hidden">
        <div style="padding:13px 20px;display:flex;justify-content:space-between;border-bottom:1px solid #edf0f4;background:#fafafa">
          <span style="font-size:13px;color:#6b7280;font-weight:500">Total Hours</span>
          <span style="font-size:13px;color:#374151;font-weight:600">${totalHrs} hrs</span>
        </div>
        <div style="padding:13px 20px;display:flex;justify-content:space-between;border-bottom:1px solid #edf0f4;background:#fafafa">
          <span style="font-size:13px;color:#6b7280;font-weight:500">Hourly Rate</span>
          <span style="font-size:13px;color:#374151;font-weight:600">${formatAud(hourlyRate)} / hr</span>
        </div>
        <div style="padding:18px 20px;display:flex;justify-content:space-between;align-items:center;background:${primary}">
          <span style="font-size:15px;color:rgba(255,255,255,0.9);font-weight:700;letter-spacing:0.3px">TOTAL DUE</span>
          <span style="font-size:24px;color:#ffffff;font-weight:900;letter-spacing:-0.5px">$${totalAmt}</span>
        </div>
      </div>
    </div>

    <!-- ── Payment details ── -->
    ${paymentBlock}

    <!-- ── Notes ── -->
    ${notesBlock}

    <!-- ── Footer ── -->
    <div style="margin-top:48px;padding-top:20px;border-top:1px solid #edf0f4;display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:11px;color:#d1d5db">Generated via <strong style="color:#9ca3af">SiteTrack</strong> &middot; ${issueDate}</div>
      <div style="font-size:11px;color:#d1d5db">${inv.invoiceNumber}</div>
    </div>

  </div><!-- /main content -->
</div><!-- /page wrapper -->

</body>
</html>`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────
const PRESETS = [
  { key: "last_fortnight", label: "Last 14 Days" },
  { key: "last_week", label: "Last Week" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
];

export default function EmpInvoicesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedPreset, setSelectedPreset] = useState("this_month");
  const [selectedPaymentTerms, setSelectedPaymentTerms] = useState<PaymentTermsKey>("on_receipt");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // ── Load invoices list ──
  const loadInvoices = useCallback(async () => {
    try {
      const data = await apiFetch<InvoiceRecord[]>("/invoices/my");
      setInvoices(data);
    } catch {
    } finally {
      setListLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  // ── Load preview when period changes or modal opens ──
  useEffect(() => {
    if (!showGenerateModal) return;
    const period = getPeriod(selectedPreset);
    loadPreview(period.start, period.end);
  }, [selectedPreset, showGenerateModal]);

  async function loadPreview(start: string, end: string) {
    setPreviewLoading(true);
    setPreview(null);
    try {
      const data = await apiFetch<PreviewData>(`/invoices/preview?start=${start}&end=${end}`);
      setPreview(data);
    } catch {
    } finally {
      setPreviewLoading(false);
    }
  }

  // ── Generate invoice + share PDF ──
  async function handleGenerate() {
    if (!preview) return;
    setGenerating(true);
    setGenerateError("");
    try {
      const inv = await apiFetch<GeneratedInvoice>("/invoices/generate", {
        method: "POST",
        body: JSON.stringify({
          periodStart: preview.periodStart,
          periodEnd: preview.periodEnd,
          paymentTerms: selectedPaymentTerms,
        }),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowGenerateModal(false);
      setInvoices((prev) => [inv, ...prev]);
      await sharePdf(inv);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to generate invoice";
      setGenerateError(msg);
    } finally {
      setGenerating(false);
    }
  }

  async function sharePdf(inv: GeneratedInvoice) {
    try {
      const html = buildInvoiceHtml(inv);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Invoice ${inv.invoiceNumber}`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("PDF Saved", `Invoice saved to: ${uri}`);
      }
    } catch {
      Alert.alert("PDF Error", "Could not generate PDF. Please try again.");
    }
  }

  // ── Re-share existing invoice using stored line items ──
  async function handleReshare(inv: InvoiceRecord) {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const generated: GeneratedInvoice = {
        ...inv,
        company: {
          name: user?.companyName ?? "",
          primaryColor: user?.primaryColor ?? "#f97316",
          businessAbn: user?.companyBusinessAbn ?? null,
          businessEmail: user?.companyBusinessEmail ?? null,
          businessAddress: user?.companyBusinessAddress ?? null,
        },
        user: {
          name: user?.name ?? "",
          email: user?.email ?? "",
          phone: user?.phone ?? null,
          abn: user?.abn ?? null,
          businessAddress: user?.businessAddress ?? null,
          bankName: user?.bankName ?? null,
          accountName: user?.accountName ?? null,
          bsb: user?.bsb ?? null,
          accountNumber: user?.accountNumber ?? null,
          invoiceNotes: user?.invoiceNotes ?? null,
        },
      };
      await sharePdf(generated);
    } catch {
      Alert.alert("Error", "Could not share invoice.");
    }
  }

  // ── Render invoice list item ──
  function renderInvoice({ item }: { item: InvoiceRecord }) {
    const hrs = (item.totalMinutes / 60).toFixed(1);
    return (
      <View style={[styles.invoiceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.invoiceLeft}>
          <View style={[styles.invoiceIconWrap, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="file-text" size={18} color={colors.primary} />
          </View>
          <View style={styles.invoiceInfo}>
            <Text style={[styles.invoiceNumber, { color: colors.foreground }]}>{item.invoiceNumber}</Text>
            <Text style={[styles.invoicePeriod, { color: colors.mutedForeground }]}>
              {fmtDate(item.periodStart)} – {fmtDate(item.periodEnd)}
            </Text>
            <View style={styles.invoiceMeta}>
              <Text style={[styles.invoiceHours, { color: colors.mutedForeground }]}>{hrs} hrs</Text>
              {item.paymentTerms && item.paymentTerms !== "on_receipt" ? (
                <View style={[styles.termsBadge, { backgroundColor: colors.primary + "14" }]}>
                  <Text style={[styles.termsBadgeText, { color: colors.primary }]}>
                    {paymentTermsLabel(item.paymentTerms)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
        <View style={styles.invoiceRight}>
          <Text style={[styles.invoiceAmount, { color: colors.primary }]}>
            {formatAud(Number(item.totalAmount))}
          </Text>
          <TouchableOpacity
            style={[styles.reshareBtn, { borderColor: colors.border }]}
            onPress={() => handleReshare(item)}
            activeOpacity={0.7}
          >
            <Feather name="share-2" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[colors.accent, colors.primary + "99"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>My Invoices</Text>
            <Text style={styles.headerSub}>Generate & share PDF invoices</Text>
          </View>
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: "rgba(255,255,255,0.18)" }]}
            onPress={() => { setShowGenerateModal(true); setGenerateError(""); }}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={18} color="#fff" />
            <Text style={styles.newBtnText}>New</Text>
          </TouchableOpacity>
        </View>
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: "rgba(255,255,255,0.12)" }]}>
            <Text style={styles.statNum}>{invoices.length}</Text>
            <Text style={styles.statLabel}>Invoices</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "rgba(255,255,255,0.12)" }]}>
            <Text style={styles.statNum}>
              {formatAud(invoices.reduce((s, i) => s + Number(i.totalAmount), 0))}
            </Text>
            <Text style={styles.statLabel}>Total Billed</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Invoice list */}
      {listLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : invoices.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="file-text" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No invoices yet</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Tap "+ New" to generate your first invoice
          </Text>
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          renderItem={renderInvoice}
          contentContainerStyle={[styles.list, { paddingBottom: botPad + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadInvoices(); }}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* ── Generate Invoice Modal ── */}
      <Modal
        visible={showGenerateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowGenerateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            {/* Modal handle */}
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Generate Invoice</Text>
                <TouchableOpacity onPress={() => setShowGenerateModal(false)} hitSlop={10}>
                  <Feather name="x" size={22} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              {/* Period selector */}
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SELECT PERIOD</Text>
              <View style={styles.presetGrid}>
                {PRESETS.map((p) => {
                  const active = p.key === selectedPreset;
                  return (
                    <TouchableOpacity
                      key={p.key}
                      style={[
                        styles.presetBtn,
                        {
                          backgroundColor: active ? colors.primary : colors.background,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => { setSelectedPreset(p.key); Haptics.selectionAsync(); }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.presetBtnText, { color: active ? "#fff" : colors.foreground }]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Payment terms selector */}
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PAYMENT TERMS</Text>
              <View style={styles.termsGrid}>
                {PAYMENT_TERMS.map((t) => {
                  const active = t.key === selectedPaymentTerms;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      style={[
                        styles.termsBtn,
                        {
                          backgroundColor: active ? colors.primary + "12" : colors.background,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => { setSelectedPaymentTerms(t.key); Haptics.selectionAsync(); }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.termsBtnLabel, { color: active ? colors.primary : colors.foreground }]}>
                        {t.label}
                      </Text>
                      <Text style={[styles.termsBtnSub, { color: active ? colors.primary + "aa" : colors.mutedForeground }]}>
                        {t.description}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Preview */}
              {previewLoading ? (
                <View style={styles.previewLoading}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.previewLoadingText, { color: colors.mutedForeground }]}>
                    Loading hours…
                  </Text>
                </View>
              ) : preview ? (
                <View style={[styles.previewCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.previewPeriod, { color: colors.mutedForeground }]}>
                    {fmtDate(preview.periodStart)} – {fmtDate(preview.periodEnd)}
                  </Text>
                  <View style={styles.previewStats}>
                    <View style={styles.previewStat}>
                      <Text style={[styles.previewStatNum, { color: colors.foreground }]}>
                        {durLabel(preview.totalMinutes)}
                      </Text>
                      <Text style={[styles.previewStatLabel, { color: colors.mutedForeground }]}>Hours</Text>
                    </View>
                    <View style={[styles.previewDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.previewStat}>
                      <Text style={[styles.previewStatNum, { color: colors.foreground }]}>
                        {formatAud(preview.hourlyRate)}
                      </Text>
                      <Text style={[styles.previewStatLabel, { color: colors.mutedForeground }]}>Rate / hr</Text>
                    </View>
                    <View style={[styles.previewDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.previewStat}>
                      <Text style={[styles.previewStatNum, { color: colors.primary }]}>
                        {formatAud(preview.totalAmount)}
                      </Text>
                      <Text style={[styles.previewStatLabel, { color: colors.mutedForeground }]}>Total</Text>
                    </View>
                  </View>

                  {preview.lineItems.length === 0 ? (
                    <Text style={[styles.noHours, { color: colors.mutedForeground }]}>
                      No completed sessions in this period.
                    </Text>
                  ) : (
                    <View style={styles.lineItemList}>
                      {preview.lineItems.slice(0, 6).map((li) => (
                        <View key={li.id} style={[styles.lineItem, { borderBottomColor: colors.border }]}>
                          <Text style={[styles.liDate, { color: colors.mutedForeground }]}>
                            {fmtDate(li.date)}
                          </Text>
                          <Text style={[styles.liProject, { color: colors.foreground }]} numberOfLines={1}>
                            {li.projectName}
                          </Text>
                          <Text style={[styles.liDur, { color: colors.primary }]}>
                            {durLabel(li.minutes)}
                          </Text>
                        </View>
                      ))}
                      {preview.lineItems.length > 6 && (
                        <Text style={[styles.moreItems, { color: colors.mutedForeground }]}>
                          +{preview.lineItems.length - 6} more sessions
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              ) : null}

              {generateError ? (
                <View style={[styles.errorBox, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" }]}>
                  <Feather name="alert-circle" size={14} color={colors.destructive} />
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{generateError}</Text>
                </View>
              ) : null}

              {/* Generate button */}
              <TouchableOpacity
                style={[
                  styles.generateBtn,
                  {
                    backgroundColor: !preview || preview.lineItems.length === 0
                      ? colors.mutedForeground
                      : colors.primary,
                    opacity: generating ? 0.7 : 1,
                  },
                ]}
                onPress={handleGenerate}
                disabled={generating || !preview || preview.lineItems.length === 0}
                activeOpacity={0.85}
              >
                {generating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="download" size={18} color="#fff" />
                    <Text style={styles.generateBtnText}>Generate Invoice & Save PDF</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={[styles.pdfHint, { color: colors.mutedForeground }]}>
                A PDF invoice will be created and shared from your device.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  newBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  statsRow: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 3,
  },
  statNum: { fontSize: 18, fontWeight: "800", color: "#fff" },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: "600" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20 },

  list: { padding: 16, gap: 12 },

  invoiceCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  invoiceLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  invoiceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  invoiceInfo: { flex: 1, gap: 2 },
  invoiceNumber: { fontSize: 15, fontWeight: "700" },
  invoicePeriod: { fontSize: 12 },
  invoiceMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  invoiceHours: { fontSize: 12 },
  termsBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  termsBadgeText: { fontSize: 10, fontWeight: "700" },
  invoiceRight: { alignItems: "flex-end", gap: 8 },
  invoiceAmount: { fontSize: 16, fontWeight: "800" },
  reshareBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: "94%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "800" },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 10,
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 22,
  },
  presetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  presetBtnText: { fontSize: 13, fontWeight: "600" },

  // Payment terms
  termsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 22,
  },
  termsBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    minWidth: "46%",
    flex: 1,
  },
  termsBtnLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  termsBtnSub: {
    fontSize: 11,
    fontWeight: "500",
  },

  previewLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
    padding: 24,
  },
  previewLoadingText: { fontSize: 14 },

  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    marginBottom: 16,
  },
  previewPeriod: { fontSize: 12, fontWeight: "600" },
  previewStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  previewStat: { flex: 1, alignItems: "center", gap: 3 },
  previewStatNum: { fontSize: 16, fontWeight: "800" },
  previewStatLabel: { fontSize: 11, fontWeight: "600" },
  previewDivider: { width: 1, height: 36 },

  noHours: { fontSize: 13, textAlign: "center", padding: 8 },

  lineItemList: { gap: 0 },
  lineItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    gap: 8,
  },
  liDate: { fontSize: 12, width: 72 },
  liProject: { flex: 1, fontSize: 13, fontWeight: "500" },
  liDur: { fontSize: 13, fontWeight: "700" },
  moreItems: { fontSize: 12, textAlign: "center", paddingTop: 8 },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  errorText: { fontSize: 13, flex: 1, fontWeight: "500" },

  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  generateBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  pdfHint: { fontSize: 12, textAlign: "center", lineHeight: 16 },
});
