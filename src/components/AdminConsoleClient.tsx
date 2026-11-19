"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Edit3,
  ExternalLink,
  Eye,
  KeyRound,
  Languages,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageCircle,
  Moon,
  Package,
  Plus,
  QrCode,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Store,
  Sun,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { ItemFormModal } from "@/components/ItemFormModal";
import { usePreferences } from "@/components/PreferencesProvider";
import { QrisCard } from "@/components/QrisCard";
import {
  buildWhatsAppUrl,
  formatDateTime,
  formatRupiah,
  formatWhatsAppDisplay,
} from "@/lib/format";
import { getRoleLabel, getStatusLabel } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { uploadImageToBucket } from "@/lib/upload";
import type {
  AuditLog,
  BankAccountOption,
  Booking,
  BookingStatus,
  PermissionDefinition,
  Profile,
  RbacContext,
  RentalItem,
  RoleDefinition,
  RoleName,
  RolePermissionEntry,
  StoreSettings,
} from "@/types/rental";

interface AdminConsoleClientProps {
  rbac: RbacContext;
  initialSettings: StoreSettings;
  initialItems: RentalItem[];
  initialBookings: Booking[];
  initialRoles: RoleDefinition[];
  initialPermissions: PermissionDefinition[];
  initialRolePermissions: RolePermissionEntry[];
  initialProfiles: Profile[];
  initialAuditLogs: AuditLog[];
}

type AdminTab = "overview" | "bookings" | "catalog" | "settings" | "rbac" | "audit";

export function AdminConsoleClient({
  rbac,
  initialSettings,
  initialItems,
  initialBookings,
  initialRoles,
  initialPermissions,
  initialRolePermissions,
  initialProfiles,
  initialAuditLogs,
}: AdminConsoleClientProps) {
  const router = useRouter();
  const { theme, language, toggleTheme, toggleLanguage, t } = usePreferences();

  const perms = rbac.permissions || [];
  const hasPerm = (p: string) => perms.includes(p);

  const canManageItems = hasPerm("items:manage_all");
  const canToggleItems = hasPerm("items:toggle_availability");
  const canVerifyPayments = hasPerm("bookings:verify_payment");
  const canUpdateBookingStatus = hasPerm("bookings:update_status");
  const canConfirmReturn = hasPerm("bookings:confirm_owner_return");
  const canApproveExt = hasPerm("bookings:approve_extension");
  const canManageSettings =
    hasPerm("settings:manage_payment_qris") || hasPerm("settings:manage_admin_contact");
  const canManageRbac = hasPerm("rbac:manage_roles");
  const canViewRbac = hasPerm("rbac:view_users");
  const canViewAudit = hasPerm("audit:view");

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [settings, setSettings] = useState<StoreSettings>(initialSettings);
  const [items, setItems] = useState<RentalItem[]>(initialItems);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [rolePermissions, setRolePermissions] = useState<RolePermissionEntry[]>(
    initialRolePermissions
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);

  // Filters & Modals
  const [bookingFilter, setBookingFilter] = useState<string>("all");
  const [bookingSearch, setBookingSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [editingItem, setEditingItem] = useState<RentalItem | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [proofLightboxUrl, setProofLightboxUrl] = useState<string | null>(null);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<StoreSettings>(initialSettings);
  const [uploadingQris, setUploadingQris] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // New RBAC user form state
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserRole, setNewUserRole] = useState<Exclude<RoleName, "guest">>("staff");
  const [creatingUser, setCreatingUser] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [nowMs] = useState(() => Date.now());

  const showToast = (msg: string) => {
    setErrorBanner(null);
    setToast(msg);
    setTimeout(() => setToast((p) => (p === msg ? null : p)), 3200);
  };

  const showError = (msg: string) => {
    setErrorBanner(msg);
    setTimeout(() => setErrorBanner((p) => (p === msg ? null : p)), 5000);
  };

  const refreshAll = async () => {
    const [itemsRes, bookingsRes, settingsRes, rbacRes] = await Promise.all([
      fetch("/api/items?scope=all", { cache: "no-store" }),
      fetch("/api/admin/bookings", { cache: "no-store" }),
      fetch("/api/admin/settings", { cache: "no-store" }),
      canViewRbac || canViewAudit
        ? fetch("/api/admin/rbac", { cache: "no-store" })
        : Promise.resolve(null),
    ]);

    if (itemsRes.ok) {
      const d = await itemsRes.json();
      setItems(d.items || []);
    }
    if (bookingsRes.ok) {
      const d = await bookingsRes.json();
      setBookings(d.bookings || []);
    }
    if (settingsRes.ok) {
      const d = await settingsRes.json();
      if (d.settings) {
        setSettings(d.settings);
        setSettingsForm(d.settings);
      }
    }
    if (rbacRes && rbacRes.ok) {
      const d = await rbacRes.json();
      if (Array.isArray(d.profiles)) setProfiles(d.profiles);
      if (Array.isArray(d.role_permissions)) setRolePermissions(d.role_permissions);
      if (Array.isArray(d.audit_logs)) setAuditLogs(d.audit_logs);
    }
  };

  // Computed Analytics
  const stats = useMemo(() => {
    const validBookings = bookings.filter((b) => b.status !== "cancelled");
    const paidBookings = validBookings.filter((b) => b.payment_status === "paid");
    const grossRevenue = paidBookings.reduce((acc, b) => acc + Number(b.total_amount || 0), 0);
    const commissionEarned = paidBookings.reduce(
      (acc, b) => acc + Number(b.platform_commission || 0),
      0
    );
    const pendingVerification = bookings.filter(
      (b) => b.status === "waiting_verification" || b.payment_status === "pending_verification"
    ).length;
    const activeRentals = bookings.filter(
      (b) => b.status === "active" || b.status === "return_pending"
    ).length;
    const overdueCount = bookings.filter(
      (b) =>
        (b.status === "active" || b.status === "overdue") &&
        new Date(b.due_at).getTime() < nowMs
    ).length;

    return {
      grossRevenue,
      commissionEarned,
      pendingVerification,
      activeRentals,
      overdueCount,
      totalItems: items.length,
      activeItems: items.filter((i) => i.is_active).length,
    };
  }, [bookings, items, nowMs]);

  const filteredBookings = useMemo(() => {
    const q = bookingSearch.trim().toLowerCase();
    return bookings.filter((b) => {
      if (bookingFilter !== "all" && b.status !== bookingFilter) return false;
      if (!q) return true;
      return `${b.booking_code} ${b.renter_name} ${b.renter_phone} ${b.item_name} ${b.renter_identity_number}`
        .toLowerCase()
        .includes(q);
    });
  }, [bookings, bookingFilter, bookingSearch]);

  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      `${i.name} ${i.name_id} ${i.category} ${i.location} ${i.owner_name}`
        .toLowerCase()
        .includes(q)
    );
  }, [items, itemSearch]);

  // Booking Actions
  const handleVerifyPayment = async (bookingId: string, decision: "approve" | "reject") => {
    const res = await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify_payment",
        booking_id: bookingId,
        decision,
        note: decision === "approve" ? "Verified by Console" : "Payment proof invalid",
      }),
    });
    const data = await res.json();
    if (!res.ok) return showError(data.error || "Failed");
    showToast(
      decision === "approve"
        ? language === "id"
          ? "Pembayaran diverifikasi & sewa aktif!"
          : "Payment verified & rental activated!"
        : language === "id"
        ? "Pembayaran ditolak."
        : "Payment rejected."
    );
    await refreshAll();
  };

  const handleBookingStatusChange = async (bookingId: string, status: BookingStatus) => {
    const res = await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_status", booking_id: bookingId, status }),
    });
    const data = await res.json();
    if (!res.ok) return showError(data.error || "Status update failed");
    showToast(language === "id" ? "Status sewa diperbarui." : "Booking status updated.");
    await refreshAll();
  };

  const handleConfirmOwnerReturn = async (bookingId: string) => {
    const res = await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm_owner_return", booking_id: bookingId }),
    });
    const data = await res.json();
    if (!res.ok) return showError(data.error || "Confirm return failed");
    showToast(
      language === "id"
        ? "Pengembalian dikonfirmasi & stok dipulihkan!"
        : "Return confirmed & stock restored!"
    );
    await refreshAll();
  };

  const handleResolveExt = async (extensionId: string, decision: "approve" | "reject") => {
    const res = await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve_extension", extension_id: extensionId, decision }),
    });
    const data = await res.json();
    if (!res.ok) return showError(data.error || "Failed");
    showToast(
      decision === "approve"
        ? language === "id"
          ? "Perpanjangan disetujui!"
          : "Extension approved!"
        : language === "id"
        ? "Perpanjangan ditolak."
        : "Extension rejected."
    );
    await refreshAll();
  };

  // Catalog CRUD Actions
  const handleDeleteItem = async (itemId: number) => {
    const ok = window.confirm(
      language === "id"
        ? "Yakin hapus barang ini secara permanen?"
        : "Permanently delete this item?"
    );
    if (!ok) return;
    const res = await fetch(`/api/items/${itemId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return showError(data.error || "Delete failed");
    showToast(language === "id" ? "Barang dihapus." : "Item deleted.");
    await refreshAll();
  };

  const handleStaffToggleStock = async (item: RentalItem, nextActive: boolean, nextAvail: number) => {
    const res = await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_active: nextActive,
        stock_available: Math.max(0, Math.min(item.stock_total, nextAvail)),
      }),
    });
    const data = await res.json();
    if (!res.ok) return showError(data.error || "Update failed");
    showToast(language === "id" ? "Stok/status barang diperbarui." : "Stock/status updated.");
    await refreshAll();
  };

  // Settings Actions (Admin WA + QRIS)
  const handleUploadQrisImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQris(true);
    try {
      const url = await uploadImageToBucket("qris-images", file, "qris");
      setSettingsForm((prev) => ({
        ...prev,
        qris_mode: "custom_image",
        qris_image_url: url,
      }));
      showToast(
        language === "id"
          ? "Gambar QRIS diunggah! Klik Simpan Pengaturan untuk menerapkan."
          : "QRIS image uploaded! Click Save Settings to apply."
      );
    } catch (err) {
      showError(err instanceof Error ? err.message : "QRIS upload failed");
    } finally {
      setUploadingQris(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_name: settingsForm.store_name,
          admin_whatsapp: settingsForm.admin_whatsapp,
          admin_display_name: settingsForm.admin_display_name,
          pickup_hub: settingsForm.pickup_hub,
          qris_mode: settingsForm.qris_mode,
          qris_image_url: settingsForm.qris_image_url || "",
          qris_merchant_name: settingsForm.qris_merchant_name,
          qris_nmid: settingsForm.qris_nmid,
          qris_note_en: settingsForm.qris_note_en,
          qris_note_id: settingsForm.qris_note_id,
          bank_accounts: settingsForm.bank_accounts,
          service_fee_pct: Number(settingsForm.service_fee_pct),
          owner_commission_pct: Number(settingsForm.owner_commission_pct),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      showToast(
        language === "id"
          ? "Pengaturan Nomor Admin & QRIS berhasil disimpan!"
          : "Admin WhatsApp & QRIS settings saved!"
      );
      await refreshAll();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const updateBankAccount = (idx: number, patch: Partial<BankAccountOption>) => {
    setSettingsForm((prev) => {
      const next = [...(prev.bank_accounts || [])];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, bank_accounts: next };
    });
  };

  // RBAC User & Permission Actions
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      const res = await fetch("/api/admin/rbac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          full_name: newUserName,
          phone: newUserPhone,
          role: newUserRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserName("");
      setNewUserPhone("");
      showToast(
        data.email_confirmed
          ? language === "id"
            ? "Akun baru langsung aktif & siap dipakai!"
            : "New user created and ready!"
          : language === "id"
          ? "Akun dibuat! (Cek konfirmasi email jika fitur Confirm Email di Supabase Auth aktif)"
          : "Account created! (Email confirmation may be required if enabled in Supabase Auth)"
      );
      await refreshAll();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Create user failed");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleUpdateUserRole = async (
    userId: string,
    role: Exclude<RoleName, "guest">,
    isActive: boolean
  ) => {
    const res = await fetch("/api/admin/rbac", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_user_role",
        user_id: userId,
        role,
        is_active: isActive,
      }),
    });
    const data = await res.json();
    if (!res.ok) return showError(data.error || "Role update failed");
    showToast(language === "id" ? "Role pengguna diperbarui." : "User role updated.");
    await refreshAll();
  };

  const handleTogglePermission = async (
    roleName: Exclude<RoleName, "guest">,
    permissionCode: string,
    enabled: boolean
  ) => {
    const res = await fetch("/api/admin/rbac", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggle_permission",
        role_name: roleName,
        permission_code: permissionCode,
        enabled,
      }),
    });
    const data = await res.json();
    if (!res.ok) return showError(data.error || "Permission toggle failed");
    showToast(
      language === "id"
        ? `Izin ${permissionCode} untuk ${roleName} diperbarui.`
        : `Permission ${permissionCode} for ${roleName} updated.`
    );
    await refreshAll();
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const tabItems: { id: AdminTab; label: string; icon: React.ReactNode; visible: boolean }[] = [
    {
      id: "overview",
      label: t.admin.tabs.overview,
      icon: <LayoutDashboard className="h-4 w-4" />,
      visible: true,
    },
    {
      id: "bookings",
      label: `${t.admin.tabs.bookings} (${stats.pendingVerification})`,
      icon: <CreditCard className="h-4 w-4" />,
      visible: hasPerm("bookings:view_all"),
    },
    {
      id: "catalog",
      label: `${t.admin.tabs.catalog} (${items.length})`,
      icon: <Package className="h-4 w-4" />,
      visible: canManageItems || canToggleItems,
    },
    {
      id: "settings",
      label: t.admin.tabs.settings,
      icon: canManageSettings ? <Settings className="h-4 w-4" /> : <Lock className="h-4 w-4" />,
      visible: hasPerm("settings:view") || canManageSettings,
    },
    {
      id: "rbac",
      label: t.admin.tabs.rbac,
      icon: <Users className="h-4 w-4" />,
      visible: canViewRbac,
    },
    {
      id: "audit",
      label: t.admin.tabs.audit,
      icon: <Activity className="h-4 w-4" />,
      visible: canViewAudit,
    },
  ];

  return (
    <div className="min-h-screen overflow-x-clip bg-[var(--canvas)]">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href="/"
              aria-label={t.admin.backToStore}
              className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-2.5 text-xs font-bold leading-none whitespace-nowrap text-[var(--ink)] hover:border-[var(--blue)] sm:h-9 sm:px-3"
            >
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{t.admin.backToStore}</span>
            </Link>
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              <ShieldCheck className="h-5 w-5 shrink-0 text-[var(--blue)]" />
              <span className="truncate text-sm font-extrabold text-[var(--ink)] sm:text-base">
                <span className="sm:hidden">Admin</span>
                <span className="hidden sm:inline">
                  {settings.store_name} · {t.admin.title}
                </span>
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <span className="hidden max-w-[260px] items-center gap-1.5 truncate rounded-full bg-[var(--yellow-soft)] px-3 py-1.5 text-xs font-extrabold leading-none text-[var(--warn-ink)] lg:inline-flex">
              <KeyRound className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {getRoleLabel(rbac.role, language)} · {rbac.profile?.email}
              </span>
            </span>
            <Link
              href="/dashboard"
              title={t.admin.ownerHubLink}
              className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-xl bg-[var(--blue-soft)] px-2.5 text-xs font-bold leading-none whitespace-nowrap text-[var(--blue)] sm:h-9 sm:px-3"
            >
              <Store className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden md:inline">{t.admin.ownerHubLink}</span>
            </Link>
            <button
              type="button"
              onClick={refreshAll}
              title="Refresh"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] leading-none text-[var(--ink)] sm:h-9 sm:w-9"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-2 text-[11px] font-bold leading-none whitespace-nowrap text-[var(--ink)] sm:h-9 sm:px-2.5 sm:text-xs"
            >
              <Languages className="h-3.5 w-3.5 shrink-0 text-[var(--blue)]" />
              <span>{language.toUpperCase()}</span>
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? t.prefs.light : t.prefs.dark}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] leading-none text-[var(--ink)] sm:h-9 sm:w-9"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-[var(--blue)]" />
              )}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              aria-label={t.nav.logout}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold leading-none text-[var(--muted)] hover:bg-rose-500/10 hover:text-rose-500 sm:h-9 sm:w-9"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-6">
        {/* Error Banner */}
        {errorBanner ? (
          <div className="mb-4 flex items-center justify-between gap-2 rounded-2xl border border-rose-500/30 bg-[var(--danger-bg)] px-4 py-3 text-xs font-bold text-[var(--danger-ink)]">
            <span className="min-w-0 break-words">{errorBanner}</span>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {/* Navigation Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {tabItems
            .filter((tb) => tb.visible)
            .map((tb) => (
              <button
                key={tb.id}
                type="button"
                onClick={() => setActiveTab(tb.id)}
                className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-extrabold leading-none whitespace-nowrap transition ${
                  activeTab === tb.id
                    ? "border-[var(--blue)] bg-[var(--blue)] text-white shadow-xs"
                    : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--blue)]"
                }`}
              >
                {tb.icon}
                <span>{tb.label}</span>
              </button>
            ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
                <div className="text-xs font-bold text-[var(--muted)]">
                  {language === "id" ? "Total Pendapatan Terverifikasi" : "Verified Gross Revenue"}
                </div>
                <div className="font-mono-num mt-2 text-2xl font-extrabold text-[var(--blue)]">
                  {formatRupiah(stats.grossRevenue)}
                </div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  {language === "id" ? "Komisi Platform:" : "Platform Commission:"}{" "}
                  <strong className="font-mono-num text-[var(--ink)]">
                    {formatRupiah(stats.commissionEarned)}
                  </strong>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
                <div className="text-xs font-bold text-[var(--muted)]">
                  {language === "id" ? "Menunggu Verifikasi QRIS" : "Pending Payment Verification"}
                </div>
                <div className="font-mono-num mt-2 text-2xl font-extrabold text-amber-500">
                  {stats.pendingVerification}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBookingFilter("waiting_verification");
                    setActiveTab("bookings");
                  }}
                  className="mt-1 text-xs font-bold text-[var(--blue)] hover:underline"
                >
                  {language === "id" ? "Periksa bukti bayar →" : "Review payment proofs →"}
                </button>
              </div>

              <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
                <div className="text-xs font-bold text-[var(--muted)]">
                  {language === "id" ? "Sewa Aktif / Berjalan" : "Active Rentals"}
                </div>
                <div className="font-mono-num mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {stats.activeRentals}
                </div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  {language === "id" ? "Terlambat kembali:" : "Overdue alerts:"}{" "}
                  <strong className={stats.overdueCount > 0 ? "text-rose-500" : ""}>
                    {stats.overdueCount}
                  </strong>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
                <div className="text-xs font-bold text-[var(--muted)]">
                  {language === "id" ? "Barang Katalog" : "Catalog Items"}
                </div>
                <div className="font-mono-num mt-2 text-2xl font-extrabold text-[var(--ink)]">
                  {stats.activeItems} / {stats.totalItems}
                </div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  WA Admin:{" "}
                  <strong className="font-mono-num">
                    {formatWhatsAppDisplay(settings.admin_whatsapp)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Active RBAC Capabilities Card */}
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
              <h3 className="text-sm font-extrabold text-[var(--ink)]">
                {language === "id"
                  ? "Hak Akses RBAC Akun Anda Saat Ini"
                  : "Your Current RBAC Role & Active Permissions"}
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Role: <strong className="text-[var(--blue)]">{getRoleLabel(rbac.role, language)}</strong>{" "}
                ({rbac.role})
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {perms.map((p) => (
                  <span
                    key={p}
                    className="font-mono-num rounded-lg bg-[var(--blue-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--blue)]"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* TAB 2: BOOKINGS & QRIS VERIFICATION */}
        {activeTab === "bookings" ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    "all",
                    "waiting_verification",
                    "pending_payment",
                    "active",
                    "return_pending",
                    "returned",
                    "cancelled",
                  ] as const
                ).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setBookingFilter(st)}
                    className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-bold leading-none whitespace-nowrap transition ${
                      bookingFilter === st
                        ? "bg-[var(--blue)] text-white"
                        : "bg-[var(--surface-subtle)] text-[var(--muted)] hover:text-[var(--ink)]"
                    }`}
                  >
                    {st === "all"
                      ? language === "id"
                        ? "Semua"
                        : "All"
                      : getStatusLabel(st, language)}
                  </button>
                ))}
              </div>

              <div className="flex w-full items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 lg:w-64">
                <Search className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                <input
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  placeholder={language === "id" ? "Cari kode, nama, WA..." : "Search code, name, WA..."}
                  className="min-w-0 flex-1 bg-transparent text-xs text-[var(--ink)] outline-none"
                />
              </div>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--paper)] p-10 text-center text-sm text-[var(--muted)]">
                {language === "id" ? "Tidak ada pesanan yang cocok." : "No matching bookings."}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((b) => {
                  const pendingExt = b.extensions?.find((ex) => ex.status === "pending");
                  return (
                    <article
                      key={b.id}
                      className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 shadow-xs sm:p-5"
                    >
                      <div className="flex flex-col justify-between gap-3 border-b border-[var(--line)] pb-3 sm:flex-row sm:items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono-num inline-flex items-center justify-center rounded-lg bg-[var(--blue-soft)] px-2.5 py-1 text-xs font-extrabold leading-none text-[var(--blue)]">
                              {b.booking_code}
                            </span>
                            <span className="inline-flex items-center justify-center rounded-full bg-[var(--warn-bg)] px-2.5 py-1 text-[11px] font-bold leading-none whitespace-nowrap text-[var(--warn-ink)]">
                              {getStatusLabel(b.status, language)}
                            </span>
                            <span
                              className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-bold leading-none whitespace-nowrap ${
                                b.payment_status === "paid"
                                  ? "bg-[var(--success-bg)] text-[var(--success-ink)]"
                                  : b.payment_status === "rejected"
                                  ? "bg-[var(--danger-bg)] text-[var(--danger-ink)]"
                                  : "bg-[var(--surface-subtle)] text-[var(--ink)]"
                              }`}
                            >
                              {b.payment_method} · {getStatusLabel(b.payment_status, language)}
                            </span>
                          </div>
                          <h3 className="mt-2 break-words text-base font-extrabold text-[var(--ink)]">
                            {b.item_name}{" "}
                            <span className="font-mono-num text-sm font-bold text-[var(--muted)]">
                              ({b.quantity}x · {b.days} {language === "id" ? "hari" : "days"})
                            </span>
                          </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                          <a
                            href={buildWhatsAppUrl(
                              b.renter_phone,
                              `Halo ${b.renter_name}, ini Admin ${settings.store_name} terkait pesanan ${b.booking_code} (${b.item_name}).`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600/15 px-3 py-2 text-xs font-bold leading-none whitespace-nowrap text-emerald-700 dark:text-emerald-300"
                          >
                            <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                            <span className="max-w-[140px] truncate">WA {b.renter_name}</span>
                          </a>
                          {canUpdateBookingStatus ? (
                            <select
                              value={b.status}
                              onChange={(e) =>
                                handleBookingStatusChange(b.id, e.target.value as BookingStatus)
                              }
                              className="min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-2.5 py-1.5 text-xs font-bold text-[var(--ink)]"
                            >
                              {(
                                [
                                  "pending_payment",
                                  "waiting_verification",
                                  "active",
                                  "overdue",
                                  "return_pending",
                                  "returned",
                                  "cancelled",
                                ] as BookingStatus[]
                              ).map((st) => (
                                <option key={st} value={st}>
                                  {getStatusLabel(st, language)}
                                </option>
                              ))}
                            </select>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 text-xs md:grid-cols-3">
                        <div className="min-w-0 rounded-xl bg-[var(--surface-subtle)] p-3">
                          <div className="font-bold text-[var(--muted)]">
                            {language === "id" ? "Data Diri Peminjam" : "Borrower Identity"}
                          </div>
                          <div className="mt-1 font-extrabold text-[var(--ink)]">{b.renter_name}</div>
                          <div className="font-mono-num text-[var(--muted)]">
                            WA: {b.renter_phone}
                          </div>
                          <div className="font-mono-num text-[var(--muted)]">
                            {b.renter_identity_type}: {b.renter_identity_number}
                          </div>
                          <div className="break-words text-[var(--muted)]">{b.renter_address}</div>
                          {b.renter_notes ? (
                            <div className="mt-1 break-words italic text-[var(--ink)]">
                              “{b.renter_notes}”
                            </div>
                          ) : null}
                        </div>

                        <div className="min-w-0 rounded-xl bg-[var(--surface-subtle)] p-3">
                          <div className="font-bold text-[var(--muted)]">
                            {language === "id" ? "Rincian Biaya" : "Financial Summary"}
                          </div>
                          <div className="mt-1 flex justify-between gap-2">
                            <span>Subtotal</span>
                            <span className="font-mono-num">{formatRupiah(b.subtotal)}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span>Service Fee</span>
                            <span className="font-mono-num">{formatRupiah(b.service_fee)}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span>Deposit</span>
                            <span className="font-mono-num">{formatRupiah(b.deposit_total)}</span>
                          </div>
                          <div className="mt-1 flex justify-between gap-2 border-t border-[var(--line)] pt-1 font-extrabold text-[var(--blue)]">
                            <span>Total</span>
                            <span className="font-mono-num">{formatRupiah(b.total_amount)}</span>
                          </div>
                          <div className="mt-1 truncate text-[11px] text-[var(--muted)]">
                            Owner: {b.owner_name} ({formatRupiah(b.owner_payout)})
                          </div>
                        </div>

                        <div className="min-w-0 rounded-xl bg-[var(--surface-subtle)] p-3">
                          <div className="font-bold text-[var(--muted)]">
                            {language === "id" ? "Bukti Bayar & Pengembalian" : "Proof & Return"}
                          </div>
                          <div className="mt-1 break-words text-[var(--ink)]">
                            {formatDateTime(b.start_at, language)} → {formatDateTime(b.due_at, language)}
                          </div>
                          {b.payment_reference ? (
                            <div className="font-mono-num mt-1 break-all text-[var(--muted)]">
                              Ref: {b.payment_reference}
                            </div>
                          ) : null}
                          {b.payment_proof_url ? (
                            <button
                              type="button"
                              onClick={() => setProofLightboxUrl(b.payment_proof_url)}
                              className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--blue-soft)] px-3 py-1.5 text-xs font-bold leading-none whitespace-nowrap text-[var(--blue)]"
                            >
                              <Eye className="h-3.5 w-3.5 shrink-0" />
                              <span>{language === "id" ? "Lihat Bukti Transfer" : "View Payment Proof"}</span>
                            </button>
                          ) : (
                            <div className="mt-1.5 text-[var(--muted)]">
                              {language === "id" ? "Belum ada file bukti." : "No proof uploaded yet."}
                            </div>
                          )}
                        </div>
                      </div>

                      {pendingExt ? (
                        <div className="mt-3 flex flex-col justify-between gap-2.5 rounded-xl border border-amber-400/40 bg-[var(--warn-bg)] p-3 text-xs sm:flex-row sm:items-center">
                          <span className="font-bold text-[var(--warn-ink)]">
                            {language === "id"
                              ? `Perpanjangan +${pendingExt.extra_days} hari (${formatRupiah(pendingExt.total_amount)} via ${pendingExt.payment_method})`
                              : `Extension +${pendingExt.extra_days} days (${formatRupiah(pendingExt.total_amount)} via ${pendingExt.payment_method})`}
                          </span>
                          {canApproveExt ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleResolveExt(pendingExt.id, "approve")}
                                className="inline-flex items-center justify-center rounded-lg bg-[var(--blue)] px-3.5 py-2 text-xs font-extrabold leading-none whitespace-nowrap text-white"
                              >
                                {language === "id" ? "Setujui" : "Approve"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResolveExt(pendingExt.id, "reject")}
                                className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-extrabold leading-none whitespace-nowrap text-white"
                              >
                                {language === "id" ? "Tolak" : "Reject"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        {canVerifyPayments && b.payment_status !== "paid" && b.status !== "cancelled" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleVerifyPayment(b.id, "approve")}
                              className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-center text-xs font-extrabold leading-tight whitespace-nowrap text-white hover:bg-emerald-700 sm:w-auto"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              <span>{language === "id" ? "Verifikasi Lunas & Aktifkan" : "Verify Paid & Activate"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVerifyPayment(b.id, "reject")}
                              className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--danger-bg)] px-3.5 py-2 text-center text-xs font-extrabold leading-tight whitespace-nowrap text-[var(--danger-ink)] sm:w-auto"
                            >
                              <XCircle className="h-3.5 w-3.5 shrink-0" />
                              <span>{language === "id" ? "Tolak Bukti" : "Reject Proof"}</span>
                            </button>
                          </>
                        ) : null}

                        {canConfirmReturn && !b.return_confirmed_by_owner && b.status !== "cancelled" ? (
                          <button
                            type="button"
                            onClick={() => handleConfirmOwnerReturn(b.id)}
                            className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--yellow-soft)] px-3.5 py-2 text-center text-xs font-extrabold leading-tight whitespace-nowrap text-[var(--warn-ink)] sm:w-auto"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              {language === "id"
                                ? "Konfirmasi Pengembalian (Pulihkan Stok)"
                                : "Confirm Return (Restore Stock)"}
                            </span>
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {/* TAB 3: ITEMS CRUD */}
        {activeTab === "catalog" ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex w-full items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 sm:w-72">
                <Search className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                <input
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder={language === "id" ? "Cari nama barang, kategori..." : "Search item, category..."}
                  className="min-w-0 flex-1 bg-transparent text-xs text-[var(--ink)] outline-none"
                />
              </div>

              {canManageItems ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setItemModalOpen(true);
                  }}
                  className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--blue)] px-4 py-2.5 text-xs font-extrabold leading-none whitespace-nowrap text-white hover:bg-[var(--blue-dark)] sm:w-auto"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span>{language === "id" ? "Tambah Barang" : "Add Item"}</span>
                </button>
              ) : (
                <span className="inline-flex items-center justify-center rounded-xl bg-[var(--yellow-soft)] px-3 py-2 text-center text-xs font-bold text-[var(--warn-ink)]">
                  {language === "id"
                    ? "Mode Staff: hanya ubah ketersediaan & stok"
                    : "Staff mode: toggle availability & stock only"}
                </span>
              )}
            </div>

            {/* Mobile-first Item Cards */}
            <div className="grid gap-3 md:hidden">
              {filteredItems.map((it) => (
                <article
                  key={it.id}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 shadow-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-14 w-16 shrink-0 overflow-hidden rounded-xl tone-${it.tone}`}>
                      {it.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl leading-none">
                          {it.emoji}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] font-extrabold text-[var(--blue)] uppercase">
                          {it.category}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStaffToggleStock(it, !it.is_active, it.stock_available)}
                          className={`inline-flex shrink-0 items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-extrabold leading-none whitespace-nowrap ${
                            it.is_active
                              ? "bg-[var(--success-bg)] text-[var(--success-ink)]"
                              : "bg-slate-500/20 text-[var(--muted)]"
                          }`}
                        >
                          {it.is_active ? (language === "id" ? "Aktif" : "Active") : "Nonaktif"}
                        </button>
                      </div>
                      <h3 className="mt-0.5 truncate text-sm font-extrabold text-[var(--ink)]">{it.name}</h3>
                      <div className="truncate text-[11px] text-[var(--muted)]">
                        {it.location} · {it.owner_name}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-3">
                    <div className="font-mono-num text-sm font-extrabold text-[var(--ink)]">
                      {formatRupiah(it.price_per_day)}
                      <span className="text-[11px] font-normal text-[var(--muted)]"> / hari</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-1">
                        <button
                          type="button"
                          aria-label="Decrease stock"
                          onClick={() => handleStaffToggleStock(it, it.is_active, it.stock_available - 1)}
                          className="font-mono-num inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--paper)] text-sm font-extrabold leading-none text-[var(--ink)] shadow-2xs"
                        >
                          -
                        </button>
                        <span className="font-mono-num inline-flex min-w-[44px] items-center justify-center px-1 text-center text-xs font-extrabold leading-none">
                          {it.stock_available}/{it.stock_total}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase stock"
                          onClick={() => handleStaffToggleStock(it, it.is_active, it.stock_available + 1)}
                          className="font-mono-num inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--paper)] text-sm font-extrabold leading-none text-[var(--ink)] shadow-2xs"
                        >
                          +
                        </button>
                      </div>

                      {canManageItems ? (
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            aria-label="Edit item"
                            onClick={() => {
                              setEditingItem(it);
                              setItemModalOpen(true);
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--blue-soft)] text-[var(--blue)]"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Delete item"
                            onClick={() => handleDeleteItem(it.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--danger-bg)] text-[var(--danger-ink)]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Desktop Catalog Table */}
            <div className="hidden overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--paper)] md:block">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--line)] bg-[var(--surface-subtle)] text-[11px] font-extrabold tracking-wide text-[var(--muted)] uppercase">
                  <tr>
                    <th className="px-4 py-3">{language === "id" ? "Barang" : "Item"}</th>
                    <th className="px-4 py-3">{language === "id" ? "Kategori" : "Category"}</th>
                    <th className="px-4 py-3 whitespace-nowrap">{language === "id" ? "Tarif / Hari" : "Rate / Day"}</th>
                    <th className="px-4 py-3">{language === "id" ? "Stok" : "Stock"}</th>
                    <th className="px-4 py-3">{language === "id" ? "Pemilik" : "Owner"}</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">{language === "id" ? "Aksi" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {filteredItems.map((it) => (
                    <tr key={it.id} className="hover:bg-[var(--surface-subtle)]/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-11 w-14 shrink-0 overflow-hidden rounded-xl tone-${it.tone}`}>
                            {it.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xl leading-none">
                                {it.emoji}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-[var(--ink)]">{it.name}</div>
                            <div className="text-[11px] text-[var(--muted)]">{it.location}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold whitespace-nowrap text-[var(--blue)]">{it.category}</td>
                      <td className="font-mono-num px-4 py-3 font-bold whitespace-nowrap text-[var(--ink)]">
                        {formatRupiah(it.price_per_day)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleStaffToggleStock(it, it.is_active, it.stock_available - 1)}
                            className="font-mono-num inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-sm font-extrabold leading-none hover:border-[var(--blue)]"
                          >
                            -
                          </button>
                          <span className="font-mono-num inline-flex min-w-[46px] items-center justify-center text-center text-xs font-extrabold leading-none">
                            {it.stock_available}/{it.stock_total}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStaffToggleStock(it, it.is_active, it.stock_available + 1)}
                            className="font-mono-num inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-sm font-extrabold leading-none hover:border-[var(--blue)]"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">{it.owner_name}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleStaffToggleStock(it, !it.is_active, it.stock_available)}
                          className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-extrabold leading-none whitespace-nowrap ${
                            it.is_active
                              ? "bg-[var(--success-bg)] text-[var(--success-ink)]"
                              : "bg-slate-500/20 text-[var(--muted)]"
                          }`}
                        >
                          {it.is_active ? (language === "id" ? "Aktif" : "Active") : "Nonaktif"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canManageItems ? (
                          <div className="inline-flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem(it);
                                setItemModalOpen(true);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--blue-soft)] text-[var(--blue)] hover:opacity-85"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(it.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--danger-bg)] text-[var(--danger-ink)] hover:opacity-85"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[var(--muted)]">RBAC Read</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* TAB 4: ADMIN CONTACT (WHATSAPP) & QRIS SETTINGS */}
        {activeTab === "settings" ? (
          <div className="space-y-5">
            {!canManageSettings ? (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-400/40 bg-[var(--warn-bg)] p-4 text-xs font-bold text-[var(--warn-ink)]">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <span>{t.admin.staffLockedSettings}</span>
              </div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-12">
              <form
                onSubmit={handleSaveSettings}
                className="min-w-0 w-full space-y-5 rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-4 sm:p-6 lg:col-span-8"
              >
                {/* Admin Contact & Store */}
                <div className="space-y-3 border-b border-[var(--line)] pb-5">
                  <h3 className="flex items-center gap-2 text-base font-extrabold text-[var(--ink)]">
                    <MessageCircle className="h-4 w-4 text-emerald-500" />
                    {language === "id"
                      ? "Nomor WhatsApp Admin & Identitas Toko"
                      : "Admin WhatsApp Number & Store Identity"}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                        {language === "id" ? "Nomor WhatsApp Admin *" : "Admin WhatsApp Number *"}
                      </label>
                      <input
                        disabled={!canManageSettings}
                        required
                        value={settingsForm.admin_whatsapp}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, admin_whatsapp: e.target.value })
                        }
                        placeholder="6281234567890"
                        className="font-mono-num w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2.5 text-sm text-[var(--ink)] disabled:opacity-60"
                      />
                      <a
                        href={buildWhatsAppUrl(settingsForm.admin_whatsapp, "Test WA Admin RentUs")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline"
                      >
                        wa.me/{settingsForm.admin_whatsapp.replace(/[^0-9]/g, "")}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                        {language === "id" ? "Nama Tampilan Admin" : "Admin Display Name"}
                      </label>
                      <input
                        disabled={!canManageSettings}
                        value={settingsForm.admin_display_name}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, admin_display_name: e.target.value })
                        }
                        className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2.5 text-sm text-[var(--ink)] disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                        {language === "id" ? "Nama Platform / Toko" : "Store / Brand Name"}
                      </label>
                      <input
                        disabled={!canManageSettings}
                        value={settingsForm.store_name}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, store_name: e.target.value })
                        }
                        className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2.5 text-sm text-[var(--ink)] disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                        {language === "id" ? "Titik Pengambilan Utama" : "Primary Pickup Hub"}
                      </label>
                      <input
                        disabled={!canManageSettings}
                        value={settingsForm.pickup_hub}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, pickup_hub: e.target.value })
                        }
                        className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2.5 text-sm text-[var(--ink)] disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                        {language === "id" ? "Biaya Layanan Peminjam (%)" : "Renter Service Fee (%)"}
                      </label>
                      <input
                        disabled={!canManageSettings}
                        type="number"
                        step="0.5"
                        min={0}
                        max={50}
                        value={settingsForm.service_fee_pct}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            service_fee_pct: Number(e.target.value),
                          })
                        }
                        className="font-mono-num w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2.5 text-sm text-[var(--ink)] disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                        {language === "id" ? "Komisi Platform Mitra (%)" : "Owner Commission (%)"}
                      </label>
                      <input
                        disabled={!canManageSettings}
                        type="number"
                        step="0.5"
                        min={0}
                        max={50}
                        value={settingsForm.owner_commission_pct}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            owner_commission_pct: Number(e.target.value),
                          })
                        }
                        className="font-mono-num w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2.5 text-sm text-[var(--ink)] disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>

                {/* QRIS Configurator */}
                <div className="space-y-3 border-b border-[var(--line)] pb-5">
                  <h3 className="flex items-center gap-2 text-base font-extrabold text-[var(--ink)]">
                    <QrCode className="h-4 w-4 text-[var(--blue)]" />
                    {language === "id"
                      ? "Pengaturan QRIS Pembayaran (Generator QRIS / Upload Gambar QRIS Asli)"
                      : "QRIS Payment Configurator (QRIS Generator / Upload Real QRIS)"}
                  </h3>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={!canManageSettings}
                      onClick={() =>
                        setSettingsForm({ ...settingsForm, qris_mode: "dummy_generated" })
                      }
                      className={`rounded-2xl border p-3.5 text-left transition ${
                        settingsForm.qris_mode === "dummy_generated"
                          ? "border-[var(--blue)] bg-[var(--blue-soft)]"
                          : "border-[var(--line)] bg-[var(--surface-subtle)]"
                      }`}
                    >
                      <div className="text-xs font-extrabold text-[var(--ink)]">
                        {language === "id" ? "Mode Generator QRIS Otomatis" : "Dynamic QRIS Generator"}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                        {language === "id"
                          ? "Membuat QR code QRIS otomatis berdasarkan Nama Merchant & NMID."
                          : "Generates a clean QRIS code automatically from Merchant Name & NMID."}
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={!canManageSettings}
                      onClick={() =>
                        setSettingsForm({ ...settingsForm, qris_mode: "custom_image" })
                      }
                      className={`rounded-2xl border p-3.5 text-left transition ${
                        settingsForm.qris_mode === "custom_image"
                          ? "border-[var(--blue)] bg-[var(--blue-soft)]"
                          : "border-[var(--line)] bg-[var(--surface-subtle)]"
                      }`}
                    >
                      <div className="text-xs font-extrabold text-[var(--ink)]">
                        {language === "id" ? "Mode Upload Gambar QRIS" : "Custom Uploaded QRIS Image"}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                        {language === "id"
                          ? "Tampilkan gambar QRIS asli toko Anda (PNG/JPG/WEBP)."
                          : "Display your uploaded official merchant QRIS image (PNG/JPG/WEBP)."}
                      </div>
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                        {language === "id" ? "Nama Merchant QRIS" : "QRIS Merchant Name"}
                      </label>
                      <input
                        disabled={!canManageSettings}
                        value={settingsForm.qris_merchant_name}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, qris_merchant_name: e.target.value })
                        }
                        className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--ink)]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[var(--ink)]">NMID</label>
                      <input
                        disabled={!canManageSettings}
                        value={settingsForm.qris_nmid}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, qris_nmid: e.target.value })
                        }
                        className="font-mono-num w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--ink)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-[var(--ink)]">
                      {language === "id"
                        ? "Upload Gambar QRIS Baru atau Tempel URL"
                        : "Upload New QRIS Image or Paste URL"}
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      {canManageSettings ? (
                        <label className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[var(--blue-soft)] px-3.5 py-2.5 text-xs font-extrabold leading-none whitespace-nowrap text-[var(--blue)] hover:opacity-90">
                          <Upload className="h-4 w-4 shrink-0" />
                          <span>
                            {uploadingQris
                              ? "Uploading..."
                              : language === "id"
                              ? "Upload Gambar QRIS"
                              : "Upload QRIS Image"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleUploadQrisImage}
                            className="hidden"
                          />
                        </label>
                      ) : null}
                      <input
                        disabled={!canManageSettings}
                        value={settingsForm.qris_image_url || ""}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, qris_image_url: e.target.value })
                        }
                        placeholder="https://.../qris.png"
                        className="min-w-0 w-full flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-xs text-[var(--ink)]"
                      />
                    </div>
                  </div>
                </div>

                {/* Bank Accounts */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-[var(--ink)]">
                      {language === "id" ? "Daftar Metode Transfer & E-Wallet" : "Bank & E-Wallet Accounts"}
                    </h3>
                    {canManageSettings ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSettingsForm((p) => ({
                            ...p,
                            bank_accounts: [
                              ...(p.bank_accounts || []),
                              { code: "BANK", label: "Bank Transfer", account_number: "", account_holder: "" },
                            ],
                          }))
                        }
                        className="rounded-lg bg-[var(--blue-soft)] px-2.5 py-1 text-xs font-bold text-[var(--blue)]"
                      >
                        + {language === "id" ? "Tambah" : "Add"}
                      </button>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {(settingsForm.bank_accounts || []).map((acc, idx) => (
                      <div key={idx} className="grid min-w-0 gap-2 rounded-xl bg-[var(--surface-subtle)] p-2.5 sm:grid-cols-12">
                        <input
                          disabled={!canManageSettings}
                          value={acc.code}
                          onChange={(e) => updateBankAccount(idx, { code: e.target.value })}
                          placeholder="Code"
                          className="min-w-0 w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2 py-1.5 text-xs font-bold sm:col-span-2"
                        />
                        <input
                          disabled={!canManageSettings}
                          value={acc.label}
                          onChange={(e) => updateBankAccount(idx, { label: e.target.value })}
                          placeholder="Label"
                          className="min-w-0 w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2 py-1.5 text-xs sm:col-span-4"
                        />
                        <input
                          disabled={!canManageSettings}
                          value={acc.account_number}
                          onChange={(e) => updateBankAccount(idx, { account_number: e.target.value })}
                          placeholder="No. Rekening / VA"
                          className="font-mono-num min-w-0 w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2 py-1.5 text-xs sm:col-span-3"
                        />
                        <input
                          disabled={!canManageSettings}
                          value={acc.account_holder}
                          onChange={(e) => updateBankAccount(idx, { account_holder: e.target.value })}
                          placeholder="Atas Nama"
                          className="min-w-0 w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2 py-1.5 text-xs sm:col-span-2"
                        />
                        {canManageSettings && acc.code !== "QRIS" ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSettingsForm((p) => ({
                                ...p,
                                bank_accounts: p.bank_accounts.filter((_, i) => i !== idx),
                              }))
                            }
                            aria-label="Remove bank account"
                            className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-[var(--danger-bg)]/50 text-rose-500 hover:bg-rose-500/15 sm:col-span-1 sm:h-auto sm:w-auto sm:bg-transparent"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                {canManageSettings ? (
                  <button
                    type="submit"
                    disabled={savingSettings || uploadingQris}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--blue)] px-5 py-3.5 text-sm font-extrabold text-white shadow-sm hover:bg-[var(--blue-dark)] disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {savingSettings
                      ? "..."
                      : language === "id"
                      ? "Simpan Pengaturan Admin & QRIS"
                      : "Save Admin & QRIS Settings"}
                  </button>
                ) : null}
              </form>

              {/* Live QRIS Checkout Preview */}
              <div className="min-w-0 w-full space-y-3 lg:col-span-4">
                <div className="rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-4 sm:p-5">
                  <div className="mb-3 text-xs font-extrabold tracking-wide text-[var(--blue)] uppercase">
                    {language === "id" ? "Pratinjau Live Checkout QRIS" : "Live Checkout QRIS Preview"}
                  </div>
                  <QrisCard settings={settingsForm} amount={75000} referenceLabel="Sample Rp75.000" />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* TAB 5: RBAC USERS & PERMISSIONS MATRIX */}
        {activeTab === "rbac" ? (
          <div className="space-y-6">
            {/* Create New Staff / Admin / Owner */}
            {canManageRbac ? (
              <form
                onSubmit={handleCreateUser}
                className="rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-5"
              >
                <h3 className="mb-3 flex items-center gap-2 text-base font-extrabold text-[var(--ink)]">
                  <UserPlus className="h-4 w-4 text-[var(--blue)]" />
                  {language === "id" ? "Buat Akun Staff / Mitra / Admin Baru" : "Create New Staff / Partner / Admin"}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <input
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder={language === "id" ? "Nama lengkap" : "Full name"}
                    className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2.5 text-xs text-[var(--ink)]"
                  />
                  <input
                    required
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="email@domain.com"
                    className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2.5 text-xs text-[var(--ink)]"
                  />
                  <input
                    required
                    type="password"
                    minLength={6}
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Password (min 6)"
                    className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2.5 text-xs text-[var(--ink)]"
                  />
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as Exclude<RoleName, "guest">)}
                    className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2.5 text-xs font-bold text-[var(--ink)]"
                  >
                    <option value="staff">Staff Operator</option>
                    <option value="owner">Owner / Mitra</option>
                    <option value="admin">Super Admin</option>
                    <option value="renter">Renter</option>
                  </select>
                  <button
                    type="submit"
                    disabled={creatingUser}
                    className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-[var(--blue)] px-4 py-2 text-xs font-extrabold leading-none whitespace-nowrap text-white hover:bg-[var(--blue-dark)] disabled:opacity-50 sm:col-span-2 lg:col-span-1"
                  >
                    {creatingUser ? "..." : language === "id" ? "+ Buat Akun" : "+ Create Account"}
                  </button>
                </div>
              </form>
            ) : null}

            {/* Mobile User Directory Cards */}
            <div className="grid gap-3 md:hidden">
              {profiles.map((prof) => (
                <div
                  key={prof.id}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold text-[var(--ink)]">
                        {prof.full_name || "-"}
                      </div>
                      <div className="font-mono-num truncate text-[11px] text-[var(--muted)]">
                        {prof.email}
                      </div>
                      <div className="font-mono-num text-[11px] text-[var(--muted)]">
                        {prof.phone || "-"}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!canManageRbac}
                      onClick={() =>
                        handleUpdateUserRole(
                          prof.id,
                          prof.role as Exclude<RoleName, "guest">,
                          !prof.is_active
                        )
                      }
                      className={`inline-flex shrink-0 items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-extrabold leading-none whitespace-nowrap ${
                        prof.is_active
                          ? "bg-[var(--success-bg)] text-[var(--success-ink)]"
                          : "bg-[var(--danger-bg)] text-[var(--danger-ink)]"
                      }`}
                    >
                      {prof.is_active ? "Active" : "Suspended"}
                    </button>
                  </div>
                  <div className="mt-3">
                    <select
                      disabled={!canManageRbac}
                      value={prof.role}
                      onChange={(e) =>
                        handleUpdateUserRole(
                          prof.id,
                          e.target.value as Exclude<RoleName, "guest">,
                          prof.is_active
                        )
                      }
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-xs font-bold text-[var(--ink)]"
                    >
                      {initialRoles.map((r) => (
                        <option key={r.name} value={r.name}>
                          {language === "id" ? r.display_name_id : r.display_name_en} ({r.name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop User Directory */}
            <div className="hidden overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--paper)] md:block">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--line)] bg-[var(--surface-subtle)] text-[11px] font-extrabold text-[var(--muted)] uppercase">
                  <tr>
                    <th className="px-4 py-3">{language === "id" ? "Pengguna" : "User"}</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role RBAC</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {profiles.map((prof) => (
                    <tr key={prof.id}>
                      <td className="px-4 py-3 font-extrabold text-[var(--ink)]">
                        {prof.full_name || "-"}
                        <div className="font-mono-num text-[11px] font-normal text-[var(--muted)]">
                          {prof.phone || "-"}
                        </div>
                      </td>
                      <td className="font-mono-num px-4 py-3 text-[var(--muted)]">{prof.email}</td>
                      <td className="px-4 py-3">
                        <select
                          disabled={!canManageRbac}
                          value={prof.role}
                          onChange={(e) =>
                            handleUpdateUserRole(
                              prof.id,
                              e.target.value as Exclude<RoleName, "guest">,
                              prof.is_active
                            )
                          }
                          className="rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] px-2.5 py-1.5 text-xs font-bold text-[var(--ink)]"
                        >
                          {initialRoles.map((r) => (
                            <option key={r.name} value={r.name}>
                              {language === "id" ? r.display_name_id : r.display_name_en} ({r.name})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={!canManageRbac}
                          onClick={() =>
                            handleUpdateUserRole(
                              prof.id,
                              prof.role as Exclude<RoleName, "guest">,
                              !prof.is_active
                            )
                          }
                          className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-extrabold leading-none whitespace-nowrap ${
                            prof.is_active
                              ? "bg-[var(--success-bg)] text-[var(--success-ink)]"
                              : "bg-[var(--danger-bg)] text-[var(--danger-ink)]"
                          }`}
                        >
                          {prof.is_active ? "Active" : "Suspended"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Interactive RBAC Permission Matrix */}
            <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
              <h3 className="mb-3 text-base font-extrabold text-[var(--ink)]">
                {language === "id"
                  ? "Matriks Hak Akses Role (RBAC Permissions Matrix)"
                  : "Live RBAC Role-Permission Matrix"}
              </h3>
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--line)] bg-[var(--surface-subtle)] text-[11px] font-extrabold text-[var(--muted)] uppercase">
                  <tr>
                    <th className="px-3 py-2.5">Permission</th>
                    {initialRoles.map((r) => (
                      <th key={r.name} className="px-3 py-2.5 text-center">
                        {r.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {initialPermissions.map((perm) => (
                    <tr key={perm.code}>
                      <td className="px-3 py-2.5">
                        <div className="font-mono-num font-bold text-[var(--ink)]">{perm.code}</div>
                        <div className="text-[11px] text-[var(--muted)]">
                          {language === "id" ? perm.description_id : perm.description_en}
                        </div>
                      </td>
                      {initialRoles.map((r) => {
                        const checked = rolePermissions.some(
                          (rp) => rp.role_name === r.name && rp.permission_code === perm.code
                        );
                        return (
                          <td key={r.name} className="px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              disabled={!canManageRbac}
                              checked={checked}
                              onChange={(e) =>
                                handleTogglePermission(r.name, perm.code, e.target.checked)
                              }
                              className="h-4 w-4 cursor-pointer accent-[var(--blue)]"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* TAB 6: AUDIT LOGS */}
        {activeTab === "audit" ? (
          <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--paper)]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--line)] bg-[var(--surface-subtle)] text-[11px] font-extrabold text-[var(--muted)] uppercase">
                <tr>
                  <th className="px-4 py-3">{language === "id" ? "Waktu" : "Timestamp"}</th>
                  <th className="px-4 py-3">{language === "id" ? "Aktor" : "Actor"}</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">{language === "id" ? "Aksi" : "Action"}</th>
                  <th className="px-4 py-3">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="font-mono-num px-4 py-2.5 text-[11px] text-[var(--muted)]">
                      {formatDateTime(log.created_at, language)}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-[var(--ink)]">{log.actor_email}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-[var(--blue-soft)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--blue)]">
                        {log.actor_role}
                      </span>
                    </td>
                    <td className="font-mono-num px-4 py-2.5 font-bold text-[var(--ink)]">
                      {log.action}
                    </td>
                    <td className="font-mono-num px-4 py-2.5 text-[var(--muted)]">
                      {log.target_type}:{log.target_id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </main>

      {/* Item CRUD Modal */}
      <ItemFormModal
        open={itemModalOpen}
        item={editingItem}
        onClose={() => setItemModalOpen(false)}
        onSaved={() => {
          refreshAll();
          showToast(language === "id" ? "Barang berhasil disimpan!" : "Item saved!");
        }}
      />

      {/* Payment Proof Lightbox */}
      {proofLightboxUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
          onClick={() => setProofLightboxUrl(null)}
        >
          <div
            className="relative max-w-xl rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setProofLightboxUrl(null)}
              className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-subtle)] leading-none text-[var(--ink)]"
            >
              <X className="h-4 w-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proofLightboxUrl}
              alt="Payment Proof"
              className="max-h-[75vh] w-auto rounded-2xl object-contain"
            />
          </div>
        </div>
      ) : null}

      {/* Toast */}
      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl bg-slate-900 px-4 py-3 text-center text-xs font-bold text-white shadow-xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
