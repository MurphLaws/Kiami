// Client-side text extraction for the paste/upload flow.
// Lazy-loaded so PDF/DOCX parser code only ships when the user actually
// uploads one of those types.

export type ParseResult = {
	text: string;
	source: "txt" | "md" | "pdf" | "docx";
};

const TXT_EXT = /\.(txt|md|markdown)$/i;
const PDF_EXT = /\.pdf$/i;
const DOCX_EXT = /\.docx$/i;

export async function parseFile(file: File): Promise<ParseResult> {
	const name = file.name;
	if (PDF_EXT.test(name) || file.type === "application/pdf") {
		return { text: await parsePdf(file), source: "pdf" };
	}
	if (
		DOCX_EXT.test(name) ||
		file.type ===
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	) {
		return { text: await parseDocx(file), source: "docx" };
	}
	if (TXT_EXT.test(name) || file.type.startsWith("text/")) {
		return { text: await readText(file), source: name.endsWith(".md") ? "md" : "txt" };
	}
	throw new Error(
		`Unsupported file type: ${name}. Use PDF, DOCX, MD, or TXT.`,
	);
}

function readText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const r = new FileReader();
		r.onload = () => resolve(String(r.result ?? ""));
		r.onerror = () => reject(r.error ?? new Error("File read failed"));
		r.readAsText(file);
	});
}

async function parsePdf(file: File): Promise<string> {
	const pdfjs = await import("pdfjs-dist");
	// Vite serves the worker as a URL — the ?url import gives us a stable
	// asset URL that works in dev and build.
	const workerUrl = (
		(await import(
			/* @vite-ignore */ "pdfjs-dist/build/pdf.worker.min.mjs?url"
		)) as { default: string }
	).default;
	pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

	const buf = await file.arrayBuffer();
	const doc = await pdfjs.getDocument({ data: buf }).promise;
	const pages: string[] = [];
	for (let i = 1; i <= doc.numPages; i++) {
		const page = await doc.getPage(i);
		const content = await page.getTextContent();
		const line = content.items
			.map((it) => ("str" in it ? it.str : ""))
			.filter(Boolean)
			.join(" ");
		pages.push(line);
	}
	return pages.join("\n\n");
}

async function parseDocx(file: File): Promise<string> {
	const mammoth = (await import(
		/* @vite-ignore */ "mammoth/mammoth.browser"
	)) as {
		extractRawText: (input: {
			arrayBuffer: ArrayBuffer;
		}) => Promise<{ value: string }>;
	};
	const buf = await file.arrayBuffer();
	const res = await mammoth.extractRawText({ arrayBuffer: buf });
	return res.value;
}
