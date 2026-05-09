// BetterContact Lead Finder client.
//
// Async submit→poll. Strips email/phone fields server-side so they never
// reach the browser, even though Lead Finder returns them.

const BC_BASE = "https://app.bettercontact.rocks/api/v2";

const PII_KEYS = new Set([
	"contact_email_address",
	"contact_email_address_status",
	"contact_email_address_provider",
	"contact_phone_number",
	"contact_phone_number_cc",
	"contact_additional_phone_number",
	"company_phone_number",
]);

function stripPii<T extends Record<string, unknown>>(lead: T): T {
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(lead)) {
		if (!PII_KEYS.has(k)) out[k] = v;
	}
	return out as T;
}

export type BcLead = Record<string, unknown>;

export type BcResult = {
	status?: string;
	credits_consumed?: number;
	credits_left?: number;
	leads?: BcLead[];
	summary?: { leads_found?: number };
	error?: string;
};

function apiKey(): string {
	const key = process.env.BETTERCONTACT_API_KEY;
	if (!key) throw new Error("BETTERCONTACT_API_KEY is not set");
	return key;
}

function bcEmail(): string {
	const email = process.env.BETTERCONTACT_EMAIL;
	if (!email) throw new Error("BETTERCONTACT_EMAIL is not set");
	return email;
}

export async function submitLeadFinder(
	filters: Record<string, unknown>,
	limit: number,
	offset?: number,
): Promise<{ success?: boolean; message?: string; request_id?: string }> {
	const body: Record<string, unknown> = { filters, limit };
	if (offset !== undefined) body.offset = offset;

	const res = await fetch(`${BC_BASE}/lead_finder/async`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-API-Key": apiKey(),
		},
		body: JSON.stringify(body),
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`BC submit ${res.status}: ${text}`);
	}
	return res.json();
}

export async function getLeadFinder(requestId: string): Promise<BcResult> {
	const res = await fetch(`${BC_BASE}/lead_finder/async/${requestId}`, {
		headers: { "X-API-Key": apiKey() },
	});
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`BC get ${res.status}: ${text}`);
	}
	const data = (await res.json()) as BcResult;
	if (Array.isArray(data.leads)) {
		data.leads = data.leads.map(stripPii);
	}
	return data;
}

const TERMINAL_OK = new Set(["terminated", "completed", "done", "finished"]);
const TERMINAL_FAIL = new Set([
	"failed",
	"error",
	"errored",
	"cancelled",
	"canceled",
]);

export async function pollLeadFinder(
	requestId: string,
	opts: { intervalMs?: number; maxMs?: number } = {},
): Promise<BcResult> {
	const intervalMs = opts.intervalMs ?? 5_000;
	const maxMs = opts.maxMs ?? 4 * 60_000;

	// Initial enqueue grace.
	await sleep(1_500);

	const start = Date.now();
	let last: BcResult = {};
	while (Date.now() - start < maxMs) {
		try {
			const r = await getLeadFinder(requestId);
			last = r;
			const status = (r.status ?? "").toLowerCase();
			if (TERMINAL_OK.has(status)) return r;
			if (TERMINAL_FAIL.has(status)) return r;
		} catch (err) {
			last = { error: err instanceof Error ? err.message : String(err) };
		}
		await sleep(intervalMs);
	}
	return last;
}

export async function getAccount(): Promise<{
	credits_left?: number;
	credits_consumed?: number;
	[k: string]: unknown;
}> {
	const u = new URL(`${BC_BASE}/account`);
	u.searchParams.set("email", bcEmail());
	u.searchParams.set("api_key", apiKey());
	const res = await fetch(u.toString());
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`BC account ${res.status}: ${text}`);
	}
	return res.json();
}

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}
