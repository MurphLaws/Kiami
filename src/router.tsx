import { ConvexQueryClient } from "@convex-dev/react-query";
import { notifyManager, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import {
	AuthKitProvider,
	useAccessToken,
	useAuth,
} from "@workos/authkit-tanstack-react-start/client";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { useCallback, useMemo } from "react";

import { routeTree } from "./routeTree.gen";
import { cacheTime } from "./config/cache";

export function getRouter() {
	if (typeof document !== "undefined") {
		notifyManager.setScheduler(window.requestAnimationFrame);
	}

	const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;

	if (!CONVEX_URL) {
		throw new Error("missing VITE_CONVEX_URL env var");
	}

	const convex = new ConvexReactClient(CONVEX_URL);
	const convexQueryClient = new ConvexQueryClient(convex);

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				queryKeyHashFn: convexQueryClient.hashFn(),
				queryFn: convexQueryClient.queryFn(),
				experimental_prefetchInRender: true,
				staleTime: cacheTime.low,
				gcTime: 5000,
				retry: 3,
				retryDelay: (attemptIndex) => Math.min(300 * 2 ** attemptIndex, 10000),
			},
		},
	});

	convexQueryClient.connect(queryClient);

	const router = createRouter({
		routeTree,
		defaultPreload: "intent",
		scrollRestoration: true,
		defaultPreloadStaleTime: 0, // Let React Query handle all caching
		defaultViewTransition: true,
		defaultErrorComponent: (err) => <p>{err.error.stack}</p>,
		defaultNotFoundComponent: () => <p>not found</p>,
		context: { queryClient, convexClient: convex, convexQueryClient },
		Wrap: ({ children }) => (
			<AuthKitProvider>
				<ConvexProviderWithAuth
					client={convexQueryClient.convexClient}
					useAuth={useAuthFromWorkOS}
				>
					{children}
				</ConvexProviderWithAuth>
			</AuthKitProvider>
		),
	});

	setupRouterSsrQueryIntegration({ router, queryClient });

	return router;
}

function useAuthFromWorkOS() {
	const { loading, user } = useAuth();
	const { getAccessToken, refresh } = useAccessToken();

	const fetchAccessToken = useCallback(
		async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
			if (!user) {
				return null;
			}

			if (forceRefreshToken) {
				return (await refresh()) ?? null;
			}

			return (await getAccessToken()) ?? null;
		},
		[user, refresh, getAccessToken],
	);

	return useMemo(
		() => ({
			isLoading: loading,
			isAuthenticated: !!user,
			fetchAccessToken,
		}),
		[loading, user, fetchAccessToken],
	);
}
