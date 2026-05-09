import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { getAuth, getSignInUrl } from "@workos/authkit-tanstack-react-start";

import { cacheTime } from "../config/cache";
import { leadsQueryOptions } from "../hooks/use-leads";

export const Route = createFileRoute("/_authenticated")({
	ssr: "data-only",
	staleTime: cacheTime.medium,
	gcTime: cacheTime.high,
	loader: async ({ context, location }) => {
		const { user } = await getAuth();

		if (!user) {
			const path = location.pathname;
			const href = await getSignInUrl({ data: { returnPathname: path } });
			throw redirect({ href });
		}

		await context.queryClient.ensureQueryData(leadsQueryOptions());
	},
	component: () => <Outlet />,
});
