// Route table for the authenticated product.
//
// Before #175 these were `#hash` fragments driven by the prototype's own
// router. They are now real App Router segments under /app; this module is
// the single mapping between the product's route ids and the URLs the browser
// sees. The conversational brand-kit is the only creation workflow; legacy
// wizard and logo-studio routes live under archive/legacy-workflows.
//
// Deliberately not a client module: route metadata is read by server
// components (per-route `generateMetadata`) as well as by the client router.

// All known routes. Determines whether a route string is valid.
export const ROUTES = [
  'home', 'chat', 'brands', 'brands-empty', 'assets', 'guides', 'settings',
] as const;

export type AppRoute = (typeof ROUTES)[number];

export function isAppRoute(value: string): value is AppRoute {
  return (ROUTES as readonly string[]).includes(value);
}

// Navigation order. Drives the fwd/back entrance animation only — it is not
// a flow, just the order screens were laid out in.
export const ROUTE_ORDER: readonly AppRoute[] = [
  'home', 'chat', 'brands', 'brands-empty', 'assets', 'guides', 'settings',
];

export const DEFAULT_ROUTE: AppRoute = 'home';

/** Build the URL for a known app route. */
export function pathForRoute(route: AppRoute): string {
  return `/app/${route}`;
}

/** Read the first `/app/<route>` segment, falling back for retired routes. */
export function routeForPath(pathname: string | null): AppRoute {
  if (!pathname) return DEFAULT_ROUTE;
  const seg = pathname.replace(/^\/app\/?/, '').split('/')[0];
  return isAppRoute(seg) ? seg : DEFAULT_ROUTE;
}

// Left rail label → route.  The rail labels are rendered by the existing
// AShell, so we match by exact text.
export const RAIL_TO_ROUTE: Record<string, AppRoute> = {
  'Home':     'home',
  'Brands':   'brands',
  'Assets':   'assets',
  'Guides':   'guides',
  'Settings': 'settings',
};

// Each screen's matching activeNav highlight + breadcrumb override.
export const ROUTE_META: Record<AppRoute, { activeNav: string; breadcrumb: string[] }> = {
  'home':         { activeNav: 'home',     breadcrumb: ['Home'] },
  'chat':         { activeNav: 'brands',   breadcrumb: ['Brands', 'Brand kit'] },
  'brands':       { activeNav: 'brands',   breadcrumb: ['Brands'] },
  'brands-empty': { activeNav: 'brands',   breadcrumb: ['Brands'] },
  'assets':       { activeNav: 'assets',   breadcrumb: ['Assets'] },
  'guides':       { activeNav: 'guides',   breadcrumb: ['Guides'] },
  'settings':     { activeNav: 'settings', breadcrumb: ['Settings'] },
};

// Per-route <title>, used by each route segment's `metadata` export. The
// hash router had no way to set these; real routes do.
export const ROUTE_TITLE: Record<string, string> = {
  'home':            'Home',
  'chat':            'Brand kit',
  'brands':          'Brands',
  'brands-empty':    'Brands',
  'assets':          'Assets',
  'guides':          'Guides',
  'settings':        'Settings',
};

export const CRUMB_TO_ROUTE: Record<string, AppRoute> = {
  'Home':      'home',
  'Brands':    'brands',
  'Assets':    'assets',
  'Guides':    'guides',
  'Settings':  'settings',
  'New brand': 'chat',
};
