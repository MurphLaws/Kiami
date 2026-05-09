import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";

export type Flow = "recruiting" | "sales";

const STORAGE_KEY = "kiami:mode";

function readStored(): Flow {
	if (typeof window === "undefined") return "recruiting";
	try {
		const v = localStorage.getItem(STORAGE_KEY);
		return v === "sales" || v === "recruiting" ? v : "recruiting";
	} catch {
		return "recruiting";
	}
}

function writeStored(v: Flow) {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(STORAGE_KEY, v);
	} catch {}
}

type ModeContextValue = {
	flow: Flow;
	setFlow: (f: Flow) => void;
};

const ModeContext = createContext<ModeContextValue | null>(null);

export function ModeProvider({ children }: { children: ReactNode }) {
	const [flow, setFlowState] = useState<Flow>("recruiting");

	useEffect(() => {
		setFlowState(readStored());
	}, []);

	const setFlow = useCallback((f: Flow) => {
		setFlowState(f);
		writeStored(f);
	}, []);

	const value = useMemo(() => ({ flow, setFlow }), [flow, setFlow]);
	return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

// Read-only when not inside the provider; useful for components that may
// render in static contexts (404, etc.).
export function useFlow(): Flow {
	const ctx = useContext(ModeContext);
	return ctx ? ctx.flow : "recruiting";
}

export function useMode(): ModeContextValue {
	const ctx = useContext(ModeContext);
	if (!ctx)
		return {
			flow: "recruiting",
			setFlow: () => {},
		};
	return ctx;
}

export const flowAccent = (f: Flow) =>
	f === "sales" ? "var(--color-coral-icon)" : "var(--color-peach-icon)";
export const flowTint = (f: Flow) =>
	f === "sales" ? "var(--color-coral)" : "var(--color-peach)";
export const flowLabel = (f: Flow) =>
	f === "sales" ? "Lead Finder" : "Recruiting";
