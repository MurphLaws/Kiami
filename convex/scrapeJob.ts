"use node";

// Fetch a job posting URL (LinkedIn guest view, Greenhouse, Lever, Ashby,
// company career pages, etc.) and extract a plain-text JD that can be
// fed into the existing search pipeline. We try three extraction
// strategies in order and pick the first that produces something useful:
//
//   1. JSON-LD `@type: JobPosting` schema — most accurate when present
//      (LinkedIn, Greenhouse, Lever, Workable all emit this).
//   2. og:description + og:title meta tags — fallback for pages without
//      structured data.
//   3. Visible <body> text with HTML tags + scripts stripped — last resort.
//
// We send a real browser User-Agent so vanilla Cloudflare/CDN gates let
// us through. If the upstream blocks us anyway, we return the error
// message and the user can paste manually.

import { v } from "convex/values";

import { action } from "./_generated/server";

type ScrapeOk = {
	ok: true;
	text: string;
	title?: string;
	company?: string;
	location?: string;
	source: "json-ld" | "og" | "body";
};
type ScrapeErr = { ok: false; error: string };
type ScrapeResult = ScrapeOk | ScrapeErr;

const UA =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

export const scrapeJob = action({
	args: { url: v.string() },
	returns: v.any(),
	handler: async (_ctx, args): Promise<ScrapeResult> => {
		const url = normalizeUrl(args.url);
		if (!url) return { ok: false, error: "That doesn't look like a URL." };

		try {
			const html = await fetchHtml(url);
			const ld = pickJobPostingLd(html);
			if (ld) {
				const text = composeFromLd(ld);
				if (text.length > 80) {
					return {
						ok: true,
						text,
						title: typeof ld.title === "string" ? ld.title : undefined,
						company: extractHiringOrg(ld),
						location: extractLocation(ld),
						source: "json-ld",
					};
				}
			}
			const og = pickOgDescription(html);
			const ogTitle = pickOgTitle(html) ?? pickPageTitle(html);
			if (og && og.length > 80) {
				return {
					ok: true,
					text: ogTitle ? `${ogTitle}\n\n${og}` : og,
					title: ogTitle ?? undefined,
					source: "og",
				};
			}
			const body = stripHtml(html);
			if (body.length > 200) {
				return {
					ok: true,
					text: ogTitle ? `${ogTitle}\n\n${body}` : body,
					title: ogTitle ?? undefined,
					source: "body",
				};
			}
			return {
				ok: false,
				error:
					"The page loaded but didn't expose the job description. Try pasting the JD manually.",
			};
		} catch (err) {
			return {
				ok: false,
				error: err instanceof Error ? err.message : String(err),
			};
		}
	},
});

function normalizeUrl(raw: string): string | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	const withScheme = /^https?:\/\//i.test(trimmed)
		? trimmed
		: `https://${trimmed}`;
	try {
		const u = new URL(withScheme);
		if (!["http:", "https:"].includes(u.protocol)) return null;

		// LinkedIn search-results URLs ship with `currentJobId=N` and are
		// not crawlable by themselves — they're an SPA shell. Rewrite to
		// the public guest job-view URL, which renders structured JD HTML.
		if (
			/(^|\.)linkedin\.com$/i.test(u.hostname) &&
			/\/jobs\/search-results\/?/i.test(u.pathname)
		) {
			const id = u.searchParams.get("currentJobId");
			if (id && /^\d+$/.test(id)) {
				return `https://www.linkedin.com/jobs/view/${id}/`;
			}
		}
		return u.toString();
	} catch {
		return null;
	}
}

async function fetchHtml(url: string): Promise<string> {
	const res = await fetch(url, {
		headers: {
			"User-Agent": UA,
			Accept:
				"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
			"Accept-Language": "en-US,en;q=0.9",
			"Cache-Control": "no-cache",
		},
		redirect: "follow",
	});
	if (!res.ok) {
		throw new Error(`upstream returned ${res.status}`);
	}
	return await res.text();
}

function pickJobPostingLd(html: string): Record<string, unknown> | null {
	const matches = html.match(
		/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
	);
	if (!matches) return null;
	for (const block of matches) {
		const inner = block.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
		try {
			const parsed = JSON.parse(inner);
			const candidates: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
			for (const c of candidates) {
				if (
					c &&
					typeof c === "object" &&
					(c as { "@type"?: unknown })["@type"] === "JobPosting"
				) {
					return c as Record<string, unknown>;
				}
				if (
					c &&
					typeof c === "object" &&
					Array.isArray((c as { "@graph"?: unknown[] })["@graph"])
				) {
					const inner = (c as { "@graph": unknown[] })["@graph"];
					for (const node of inner) {
						if (
							node &&
							typeof node === "object" &&
							(node as { "@type"?: unknown })["@type"] === "JobPosting"
						) {
							return node as Record<string, unknown>;
						}
					}
				}
			}
		} catch {
			// invalid JSON; try next block
		}
	}
	return null;
}

function composeFromLd(ld: Record<string, unknown>): string {
	const lines: string[] = [];
	const title = stringOrNull(ld.title);
	if (title) lines.push(title);

	const org = extractHiringOrg(ld);
	if (org) lines.push(`Company: ${org}`);

	const loc = extractLocation(ld);
	if (loc) lines.push(`Location: ${loc}`);

	const type = stringOrNull(ld.employmentType);
	if (type) lines.push(`Employment: ${type}`);

	const desc = stringOrNull(ld.description);
	if (desc) {
		lines.push("");
		lines.push(stripHtmlString(desc));
	}
	return lines.join("\n").trim();
}

function extractHiringOrg(ld: Record<string, unknown>): string | undefined {
	const org = ld.hiringOrganization;
	if (!org) return undefined;
	if (typeof org === "string") return org;
	if (typeof org === "object" && org) {
		const name = (org as { name?: unknown }).name;
		if (typeof name === "string") return name;
	}
	return undefined;
}

function extractLocation(ld: Record<string, unknown>): string | undefined {
	const loc = ld.jobLocation;
	const collect = (entry: unknown): string | undefined => {
		if (!entry || typeof entry !== "object") return undefined;
		const addr = (entry as { address?: unknown }).address;
		if (!addr || typeof addr !== "object") return undefined;
		const a = addr as Record<string, unknown>;
		const city = stringOrNull(a.addressLocality);
		const region = stringOrNull(a.addressRegion);
		const country = stringOrNull(a.addressCountry);
		return [city, region, country].filter(Boolean).join(", ") || undefined;
	};
	if (Array.isArray(loc)) {
		for (const x of loc) {
			const got = collect(x);
			if (got) return got;
		}
		return undefined;
	}
	return collect(loc);
}

function pickOgDescription(html: string): string | null {
	const m = html.match(
		/<meta\s+(?:[^>]*?\s)?property=["']og:description["'][^>]*?content=["']([^"']+)["']/i,
	);
	if (!m) return null;
	return decodeEntities(m[1]).trim();
}

function pickOgTitle(html: string): string | null {
	const m = html.match(
		/<meta\s+(?:[^>]*?\s)?property=["']og:title["'][^>]*?content=["']([^"']+)["']/i,
	);
	if (!m) return null;
	return decodeEntities(m[1]).trim();
}

function pickPageTitle(html: string): string | null {
	const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
	if (!m) return null;
	return decodeEntities(m[1]).trim();
}

function stripHtml(html: string): string {
	const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html;
	return stripHtmlString(body);
}

function stripHtmlString(s: string): string {
	return decodeEntities(
		s
			.replace(/<script[\s\S]*?<\/script>/gi, " ")
			.replace(/<style[\s\S]*?<\/style>/gi, " ")
			.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
			.replace(/<[^>]+>/g, " ")
			.replace(/\s+/g, " "),
	).trim();
}

function decodeEntities(s: string): string {
	return s
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, " ")
		.replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(parseInt(n, 10)))
		.replace(/&#x([0-9a-f]+);/gi, (_, h: string) =>
			String.fromCharCode(parseInt(h, 16)),
		);
}

function stringOrNull(v: unknown): string | undefined {
	return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
