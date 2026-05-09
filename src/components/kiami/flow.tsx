import { createContext, useContext, type ReactNode } from "react";

export type Flow = "recruiting" | "sales";

const FlowContext = createContext<Flow>("recruiting");

export function FlowProvider({
	value,
	children,
}: {
	value: Flow;
	children: ReactNode;
}) {
	return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export const useFlow = () => useContext(FlowContext);

export const flowAccent = (f: Flow) =>
	f === "sales" ? "var(--color-coral-icon)" : "var(--color-peach-icon)";
export const flowTint = (f: Flow) =>
	f === "sales" ? "var(--color-coral)" : "var(--color-peach)";
export const flowLabel = (f: Flow) => (f === "sales" ? "Sales GTM" : "Recruiting");
