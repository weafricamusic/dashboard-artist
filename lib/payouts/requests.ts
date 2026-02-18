import "server-only";

import { getSupabaseAdminClient } from "../supabase/admin";

export type PayoutMethod = "mobile_money" | "bank";
export type PayoutStatus = "pending" | "approved" | "rejected" | "paid";

export type PayoutRequest = {
  id: string;
  artistUid: string;
  status: PayoutStatus;
  method: PayoutMethod;
  amountCoins: number;
  amountMwk: number | null;
  createdAt: string;
};

export type PayoutPaymentMethod = {
  id: string;
  artistUid: string;
  method: PayoutMethod;
  label: string | null;
  phone: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

function parsePositiveNumber(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function parseCoinToMwkRate(): number | null {
  const raw = process.env.COIN_TO_MWK_RATE;
  return parsePositiveNumber(raw);
}

function isMissingTableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("could not find") ||
    m.includes("unknown table") ||
    (m.includes("relation") && m.includes("payout_requests")) ||
    (m.includes("relation") && m.includes("payout_payment_methods")) ||
    (m.includes("schema cache") && m.includes("payout_payment_methods"))
  );
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as UnknownRecord;
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : value == null ? null : String(value);
}

function readNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function listPayoutRequestsForArtist(
  artistUid: string,
  limit = 20,
): Promise<{ requests: PayoutRequest[]; source: "supabase" | "none"; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { requests: [], source: "none" };

  const res = await supabase
    .from("payout_requests")
    .select("id,artist_uid,status,method,amount_coins,amount_mwk,created_at")
    .eq("artist_uid", artistUid)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (res.error) {
    const msg = res.error.message ?? "Failed to load payout history";
    if (isMissingTableError(msg)) {
      return {
        requests: [],
        source: "none",
        error:
          "Payouts are not configured in Supabase yet (missing payout_requests table).",
      };
    }
    return { requests: [], source: "none", error: msg };
  }

  const rows = (res.data ?? []).map(asRecord).filter((r): r is UnknownRecord => r !== null);
  const requests: PayoutRequest[] = rows.map((row) => {
    const statusRaw = readString(row.status)?.toLowerCase() ?? "pending";
    const methodRaw = readString(row.method)?.toLowerCase() ?? "mobile_money";

    const status: PayoutStatus =
      statusRaw === "approved" || statusRaw === "rejected" || statusRaw === "paid" ? statusRaw : "pending";
    const method: PayoutMethod = methodRaw === "bank" ? "bank" : "mobile_money";

    const amountMwkValue = row.amount_mwk;
    const amountMwk = amountMwkValue === null || amountMwkValue === undefined ? null : readNumber(amountMwkValue);

    return {
      id: readString(row.id) ?? "",
      artistUid: readString(row.artist_uid) ?? artistUid,
      status,
      method,
      amountCoins: readNumber(row.amount_coins),
      amountMwk,
      createdAt: readString(row.created_at) ?? new Date().toISOString(),
    };
  });

  return { requests, source: "supabase" };
}

export type CreatePayoutRequestInput = {
  paymentMethodId?: string;
  method: PayoutMethod;
  amountCoins: number;
  phone?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  notes?: string;
};

export async function listPayoutPaymentMethodsForArtist(
  artistUid: string,
  limit = 20,
): Promise<{ methods: PayoutPaymentMethod[]; source: "supabase" | "none"; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { methods: [], source: "none" };

  const res = await supabase
    .from("payout_payment_methods")
    .select("id,artist_uid,method,label,phone,bank_name,account_number,account_name,is_default,created_at,updated_at")
    .eq("artist_uid", artistUid)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (res.error) {
    const msg = res.error.message ?? "Failed to load payment methods";
    if (isMissingTableError(msg)) {
      return { methods: [], source: "none" };
    }
    return { methods: [], source: "none", error: msg };
  }

  const rows = (res.data ?? []).map(asRecord).filter((r): r is UnknownRecord => r !== null);
  const methods: PayoutPaymentMethod[] = rows.map((row) => {
    const methodRaw = readString(row.method)?.toLowerCase() ?? "mobile_money";
    const method: PayoutMethod = methodRaw === "bank" ? "bank" : "mobile_money";

    return {
      id: readString(row.id) ?? "",
      artistUid: readString(row.artist_uid) ?? artistUid,
      method,
      label: readString(row.label),
      phone: readString(row.phone),
      bankName: readString(row.bank_name),
      accountNumber: readString(row.account_number),
      accountName: readString(row.account_name),
      isDefault: Boolean(row.is_default),
      createdAt: readString(row.created_at) ?? new Date().toISOString(),
      updatedAt: readString(row.updated_at) ?? new Date().toISOString(),
    };
  });

  return { methods, source: "supabase" };
}

export type CreatePayoutPaymentMethodInput = {
  method: PayoutMethod;
  label?: string;
  phone?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  isDefault?: boolean;
};

export async function createPayoutPaymentMethodForArtist(
  artistUid: string,
  input: CreatePayoutPaymentMethodInput,
): Promise<
  | { ok: true; id: string }
  | { ok: false; reason: "not_configured" | "table_missing" | "invalid" | "unknown"; message: string }
> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "not_configured",
      message: "Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const method = input.method === "bank" ? "bank" : "mobile_money";
  const label = (input.label ?? "").trim() || null;
  const phone = (input.phone ?? "").trim() || null;
  const bankName = (input.bankName ?? "").trim() || null;
  const accountNumber = (input.accountNumber ?? "").trim() || null;
  const accountName = (input.accountName ?? "").trim() || null;
  const isDefault = Boolean(input.isDefault);

  if (method === "mobile_money" && !phone) {
    return { ok: false, reason: "invalid", message: "Mobile money phone number is required." };
  }

  if (method === "bank" && (!bankName || !accountNumber || !accountName)) {
    return {
      ok: false,
      reason: "invalid",
      message: "Bank name, account number, and account name are required for bank payment methods.",
    };
  }

  if (isDefault) {
    await supabase
      .from("payout_payment_methods")
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq("artist_uid", artistUid);
  }

  const res = await supabase
    .from("payout_payment_methods")
    .insert({
      artist_uid: artistUid,
      method,
      label,
      phone: method === "mobile_money" ? phone : null,
      bank_name: method === "bank" ? bankName : null,
      account_number: method === "bank" ? accountNumber : null,
      account_name: method === "bank" ? accountName : null,
      is_default: isDefault,
    })
    .select("id")
    .single();

  if (res.error) {
    const msg = res.error.message ?? "Failed to save payment method";
    if (isMissingTableError(msg)) {
      return {
        ok: false,
        reason: "table_missing",
        message: "Supabase table payout_payment_methods is missing. Create it to save payment methods.",
      };
    }
    return { ok: false, reason: "unknown", message: msg };
  }

  const rec = asRecord(res.data);
  const id = rec ? readString(rec.id) : null;
  return { ok: true, id: id ?? "" };
}

export async function createPayoutRequestForArtist(
  artistUid: string,
  input: CreatePayoutRequestInput,
): Promise<
  | { ok: true; id: string }
  | { ok: false; reason: "not_configured" | "table_missing" | "invalid" | "unknown"; message: string }
> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      ok: false,
      reason: "not_configured",
      message: "Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const amountCoins = parsePositiveNumber(input.amountCoins);
  if (!amountCoins) {
    return { ok: false, reason: "invalid", message: "Amount (coins) must be a positive number." };
  }

  let method: PayoutMethod = input.method === "bank" ? "bank" : "mobile_money";
  let phone = (input.phone ?? "").trim() || null;
  let bankName = (input.bankName ?? "").trim() || null;
  let accountNumber = (input.accountNumber ?? "").trim() || null;
  let accountName = (input.accountName ?? "").trim() || null;

  const paymentMethodId = (input.paymentMethodId ?? "").trim();
  if (paymentMethodId) {
    const methodRes = await supabase
      .from("payout_payment_methods")
      .select("id,method,phone,bank_name,account_number,account_name")
      .eq("artist_uid", artistUid)
      .eq("id", paymentMethodId)
      .maybeSingle();

    if (methodRes.error) {
      const msg = methodRes.error.message ?? "Failed to load payment method";
      if (!isMissingTableError(msg)) {
        return { ok: false, reason: "unknown", message: msg };
      }
    } else {
      const row = asRecord(methodRes.data);
      if (!row) {
        return { ok: false, reason: "invalid", message: "Selected payment method was not found." };
      }

      const methodRaw = readString(row.method)?.toLowerCase() ?? "mobile_money";
      method = methodRaw === "bank" ? "bank" : "mobile_money";
      phone = readString(row.phone);
      bankName = readString(row.bank_name);
      accountNumber = readString(row.account_number);
      accountName = readString(row.account_name);
    }
  }

  if (method === "mobile_money") {
    if (!phone) {
      return { ok: false, reason: "invalid", message: "Mobile money phone number is required." };
    }
  }

  if (method === "bank") {
    if (!bankName || !accountNumber || !accountName) {
      return {
        ok: false,
        reason: "invalid",
        message: "Bank name, account number, and account name are required for bank payouts.",
      };
    }
  }

  const rate = parseCoinToMwkRate();
  const amountMwk = rate ? amountCoins * rate : null;

  const payload = {
    artist_uid: artistUid,
    status: "pending" satisfies PayoutStatus,
    method,
    amount_coins: amountCoins,
    amount_mwk: amountMwk,
    coin_to_mwk_rate: rate,
    phone: method === "mobile_money" ? phone : null,
    bank_name: method === "bank" ? bankName : null,
    account_number: method === "bank" ? accountNumber : null,
    account_name: method === "bank" ? accountName : null,
    notes: (input.notes ?? "").trim() || null,
  };

  const res = await supabase.from("payout_requests").insert(payload).select("id").single();

  if (res.error) {
    const msg = res.error.message ?? "Failed to create payout request";
    if (isMissingTableError(msg)) {
      return {
        ok: false,
        reason: "table_missing",
        message:
          "Supabase table payout_requests is missing. Create it to enable payout requests.",
      };
    }
    return { ok: false, reason: "unknown", message: msg };
  }

  const rec = asRecord(res.data);
  const id = rec ? readString(rec.id) : null;
  return { ok: true, id: id ?? "" };
}
