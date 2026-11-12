export type RoleName = "admin" | "staff" | "owner" | "renter" | "guest";

export type Language = "en" | "id";
export type Theme = "light" | "dark";

export type ItemCategory =
  | "Study"
  | "Tech"
  | "Creative"
  | "Lifestyle"
  | "Events"
  | "Other";

export type CardTone =
  | "blue"
  | "yellow"
  | "green"
  | "pink"
  | "lavender"
  | "peach";

export type BookingStatus =
  | "pending_payment"
  | "waiting_verification"
  | "active"
  | "overdue"
  | "return_pending"
  | "returned"
  | "cancelled";

export type PaymentStatus =
  | "unpaid"
  | "pending_verification"
  | "paid"
  | "rejected"
  | "refunded";

export interface BankAccountOption {
  code: string;
  label: string;
  account_number: string;
  account_holder: string;
}

export interface StoreSettings {
  id: number;
  store_name: string;
  admin_whatsapp: string;
  admin_display_name: string;
  pickup_hub: string;
  qris_mode: "dummy_generated" | "custom_image";
  qris_image_url: string | null;
  qris_merchant_name: string;
  qris_nmid: string;
  qris_note_en: string;
  qris_note_id: string;
  bank_accounts: BankAccountOption[];
  service_fee_pct: number;
  owner_commission_pct: number;
  updated_at?: string;
}

export interface RentalItem {
  id: number;
  slug: string;
  name: string;
  name_id: string;
  description: string;
  description_id: string;
  category: ItemCategory;
  emoji: string;
  tone: CardTone;
  image_url: string | null;
  price_per_day: number;
  deposit_amount: number;
  max_days: number;
  stock_total: number;
  stock_available: number;
  location: string;
  condition: string;
  condition_id: string;
  owner_id: string | null;
  owner_name: string;
  owner_email: string;
  payout_bank: string;
  payout_holder: string;
  payout_number: string;
  popularity_score: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BookingExtension {
  id: string;
  booking_id: string;
  extra_days: number;
  subtotal: number;
  service_fee: number;
  total_amount: number;
  payment_method: string;
  payment_proof_url: string | null;
  status: "pending" | "approved" | "rejected";
  approved_by: string | null;
  requested_at: string;
  resolved_at: string | null;
}

export interface Booking {
  id: string;
  booking_code: string;
  tracking_token: string;
  item_id: number;
  item_name: string;
  item_name_id: string;
  item_image_url: string | null;
  item_emoji: string;
  owner_id: string | null;
  owner_name: string;
  owner_email: string;
  owner_bank: string;
  owner_holder: string;
  owner_account: string;
  renter_name: string;
  renter_phone: string;
  renter_email: string;
  renter_identity_type: "KTM" | "KTP" | "SIM" | "PASSPORT";
  renter_identity_number: string;
  renter_address: string;
  renter_notes: string;
  quantity: number;
  price_per_day: number;
  days: number;
  subtotal: number;
  service_fee: number;
  deposit_total: number;
  total_amount: number;
  platform_commission: number;
  owner_payout: number;
  payment_method: string;
  payment_status: PaymentStatus;
  payment_proof_url: string | null;
  payment_reference: string | null;
  verified_by: string | null;
  verified_at: string | null;
  verification_note: string;
  status: BookingStatus;
  start_at: string;
  due_at: string;
  returned_at: string | null;
  return_confirmed_by_renter: boolean;
  return_confirmed_by_owner: boolean;
  stock_restored: boolean;
  created_at: string;
  updated_at: string;
  extensions?: BookingExtension[];
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  nim_or_id: string;
  role: RoleName;
  is_active: boolean;
  payout_bank: string;
  payout_holder: string;
  payout_number: string;
  created_at: string;
  updated_at: string;
}

export interface RoleDefinition {
  name: Exclude<RoleName, "guest">;
  display_name_en: string;
  display_name_id: string;
  description_en: string;
  description_id: string;
  level: number;
}

export interface PermissionDefinition {
  code: string;
  category: string;
  description_en: string;
  description_id: string;
}

export interface RolePermissionEntry {
  role_name: string;
  permission_code: string;
}

export interface AuditLog {
  id: number;
  actor_id: string | null;
  actor_email: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface RbacContext {
  authenticated: boolean;
  role: RoleName;
  is_active: boolean;
  permissions: string[];
  profile: Profile | null;
}

export interface GuestBookingToken {
  booking_code: string;
  tracking_token: string;
}

