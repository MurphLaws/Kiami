import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getAuth } from '@workos/authkit-tanstack-react-start';
import appCssUrl from '../app.css?url';
import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { ConvexReactClient } from 'convex/react';
import type { ConvexQueryClient } from '@convex-dev/react-query';
import { ThemeProvider } from '../components/layout/theme-provider';
import { ModeProvider } from '../components/kiami/flow';
import { Toaster } from '../components/ui/sonner';

const fetchWorkosAuth = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const auth = await getAuth();
    const { user } = auth;

    return {
      userId: user?.id ?? null,
      token: user ? auth.accessToken : null,
    };
  } catch {
    // WorkOS env not configured — render the app unauthenticated.
    return { userId: null, token: null };
  }
});

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  convexClient: ConvexReactClient;
  convexQueryClient: ConvexQueryClient;
}>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Kiami — Agentic search for recruiting and lead finding',
      },
      {
        name: 'description',
        content:
          'Kiami replaces complex boolean strings and filter toggling with intelligent natural-language search for recruiting and lead finding.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCssUrl },
      { rel: 'icon', type: 'image/svg+xml', href: '/kiami.svg' },
    ],
  }),
  shellComponent: RootComponent,
  notFoundComponent: () => <div>Not Found</div>,
  pendingComponent: () => <div>Loading…</div>,
  beforeLoad: async (ctx) => {
    const { userId, token } = await fetchWorkosAuth();

    // During SSR only (the only time serverHttpClient exists),
    // set the WorkOS auth token to make HTTP queries with.
    if (token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
    }

    return { userId, token };
  },
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <ModeProvider>
            {children}
            <Toaster />
          </ModeProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
