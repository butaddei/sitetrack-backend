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
interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  totalMinutes: number;
  hourlyRate: number;
  totalAmount: number;
  createdAt: string;
}

interface PreviewData {
  periodStart: string;
  periodEnd: string;
  totalMinutes: number;
  hourlyRate: number;
  totalAmount: number;
  lineItems: {
    id: string;
    date: string;
    projectName: string;
    clockIn: string;
    clockOut?: string;
    minutes: number;
  }[];
}

interface GeneratedInvoice extends InvoiceRecord {
  lineItems: PreviewData["lineItems"];
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

// ─── PDF Template ─────────────────────────────────────────────────────────────
function buildInvoiceHtml(inv: GeneratedInvoice): string {
  const primary = inv.company?.primaryColor ?? "#f97316";
  const companyName = inv.company?.name ?? "Company";
  const subName = inv.user?.name ?? "";
  const subEmail = inv.user?.email ?? "";
  const subPhone = inv.user?.phone ?? "";
  const subAbn = inv.user?.abn ?? "";
  const subAddr = inv.user?.businessAddress ?? "";
  const bankName = inv.user?.bankName ?? "";
  const accountName = inv.user?.accountName ?? "";
  const bsb = inv.user?.bsb ?? "";
  const accountNumber = inv.user?.accountNumber ?? "";
  const invoiceNotes = inv.user?.invoiceNotes ?? "";
  const companyAbn = inv.company?.businessAbn ?? "";
  const companyEmail = inv.company?.businessEmail ?? "";
  const companyAddr = inv.company?.businessAddress ?? "";

  const periodLabel = `${fmtDate(inv.periodStart)} – ${fmtDate(inv.periodEnd)}`;
  const issueDate = new Date(inv.createdAt).toLocaleDateString("en-AU", {
    day: "numeric", month: "long", year: "numeric",
  });

  const lineItemRows = inv.lineItems
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((li) => {
      const hrs = (li.minutes / 60).toFixed(2);
      const amount = ((li.minutes / 60) * inv.hourlyRate).toFixed(2);
      const timeRange = li.clockOut
        ? `${isoToLocal(li.clockIn)} – ${isoToLocal(li.clockOut)}`
        : isoToLocal(li.clockIn);
      return `
        <tr>
          <td>${fmtDate(li.date)}</td>
          <td>${li.projectName}</td>
          <td>${timeRange}</td>
          <td style="text-align:right">${hrs}</td>
          <td style="text-align:right">$${amount}</td>
        </tr>`;
    })
    .join("");

  const totalHrs = (inv.totalMinutes / 60).toFixed(2);
  const totalAmount = inv.totalAmount.toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const bankSection =
    bankName || accountName || bsb || accountNumber
      ? `
    <div class="section bank-section">
      <h3>Payment Details</h3>
      <table class="info-table">
        ${bankName ? `<tr><td>Bank</td><td>${bankName}</td></tr>` : ""}
        ${accountName ? `<tr><td>Account Name</td><td>${accountName}</td></tr>` : ""}
        ${bsb ? `<tr><td>BSB</td><td>${bsb}</td></tr>` : ""}
        ${accountNumber ? `<tr><td>Account Number</td><td>${accountNumber}</td></tr>` : ""}
      </table>
    </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Invoice ${inv.invoiceNumber}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Arial, sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; }
  .company-block { }
  .company-name { font-size: 24px; font-weight: 800; color: ${primary}; margin-bottom: 4px; }
  .company-meta { font-size: 12px; color: #555; line-height: 1.6; }
  .invoice-block { text-align: right; }
  .invoice-title { font-size: 32px; font-weight: 900; color: #111; letter-spacing: -1px; }
  .invoice-number { font-size: 14px; color: ${primary}; font-weight: 700; margin-top: 4px; }
  .invoice-meta { font-size: 12px; color: #666; margin-top: 8px; line-height: 1.7; }
  .divider { border: none; border-top: 2px solid ${primary}; margin: 0 0 28px 0; }
  .parties { display: flex; gap: 48px; margin-bottom: 28px; }
  .party { flex: 1; }
  .party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${primary}; margin-bottom: 8px; }
  .party-name { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
  .party-meta { font-size: 12px; color: #555; line-height: 1.6; }
  .section { margin-bottom: 28px; }
  .section h3 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 12px; }
  table.line-items { width: 100%; border-collapse: collapse; font-size: 12px; }
  table.line-items thead tr { background: ${primary}; color: #fff; }
  table.line-items thead th { padding: 10px 12px; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  table.line-items thead th:nth-child(4),
  table.line-items thead th:nth-child(5) { text-align: right; }
  table.line-items tbody tr:nth-child(even) { background: #f9f9f9; }
  table.line-items tbody td { padding: 9px 12px; border-bottom: 1px solid #eee; vertical-align: middle; }
  .totals-row { display: flex; justify-content: flex-end; margin-top: 16px; }
  .totals-box { background: #f5f5f5; border-radius: 10px; padding: 16px 24px; min-width: 260px; }
  .totals-line { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
  .totals-line.grand { border-top: 2px solid ${primary}; margin-top: 8px; padding-top: 10px; font-size: 18px; font-weight: 800; color: ${primary}; }
  .bank-section table.info-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .bank-section table.info-table td { padding: 7px 12px; border-bottom: 1px solid #eee; }
  .bank-section table.info-table td:first-child { font-weight: 600; color: #555; width: 40%; }
  .notes { background: #fffbf5; border-left: 4px solid ${primary}; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 12px; color: #555; line-height: 1.6; margin-bottom: 28px; }
  .footer { text-align: center; font-size: 11px; color: #aaa; margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; }
</style>
</head>
<body>

<div class="header">
  <div class="company-block">
    <div class="company-name">${companyName}</div>
    <div class="company-meta">
      ${companyAddr ? companyAddr + "<br/>" : ""}
      ${companyAbn ? "ABN: " + companyAbn + "<br/>" : ""}
      ${companyEmail ? companyEmail : ""}
    </div>
  </div>
  <div class="invoice-block">
    <div class="invoice-title">INVOICE</div>
    <div class="invoice-number">${inv.invoiceNumber}</div>
    <div class="invoice-meta">
      Date Issued: ${issueDate}<br/>
      Period: ${periodLabel}
    </div>
  </div>
</div>

<hr class="divider"/>

<div class="parties">
  <div class="party">
    <div class="party-label">Bill To</div>
    <div class="party-name">${companyName}</div>
    <div class="party-meta">
      ${companyAddr ? companyAddr + "<br/>" : ""}
      ${companyAbn ? "ABN: " + companyAbn : ""}
    </div>
  </div>
  <div class="party">
    <div class="party-label">From (Subcontractor)</div>
    <div class="party-name">${subName}</div>
    <div class="party-meta">
      ${subEmail ? subEmail + "<br/>" : ""}
      ${subPhone ? subPhone + "<br/>" : ""}
      ${subAbn ? "ABN: " + subAbn + "<br/>" : ""}
      ${subAddr ? subAddr : ""}
    </div>
  </div>
</div>

<div class="section">
  <h3>Services Rendered — ${periodLabel}</h3>
  <table class="line-items">
    <thead>
      <tr>
        <th>Date</th>
        <th>Project</th>
        <th>Hours</th>
        <th style="text-align:right">Hrs</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemRows}
    </tbody>
  </table>
  <div class="totals-row">
    <div class="totals-box">
      <div class="totals-line">
        <span>Total Hours</span>
        <span>${totalHrs} hrs</span>
      </div>
      <div class="totals-line">
        <span>Rate</span>
        <span>${formatAud(inv.hourlyRate)} / hr</span>
      </div>
      <div class="totals-line grand">
        <span>Total Due</span>
        <span>$${totalAmount}</span>
      </div>
    </div>
  </div>
</div>

${bankSection}

${invoiceNotes ? `<div class="notes"><strong>Notes:</strong> ${invoiceNotes}</div>` : ""}

<div class="footer">
  This invoice was generated via SiteTrack · ${issueDate}
</div>

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
        }),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowGenerateModal(false);
      setInvoices((prev) => [inv, ...prev]);
      // Generate and share PDF
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

  // ── Re-share existing invoice (regenerate PDF from stored data) ──
  async function handleReshare(inv: InvoiceRecord) {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // We need full data to generate PDF — re-generate using stored record values
      const generatedPlaceholder: GeneratedInvoice = {
        ...inv,
        lineItems: [],
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
      await sharePdf(generatedPlaceholder);
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
            <Text style={[styles.invoiceHours, { color: colors.mutedForeground }]}>{hrs} hrs</Text>
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
  invoiceHours: { fontSize: 12 },
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
    maxHeight: "92%",
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
    marginBottom: 20,
  },
  presetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  presetBtnText: { fontSize: 13, fontWeight: "600" },

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
