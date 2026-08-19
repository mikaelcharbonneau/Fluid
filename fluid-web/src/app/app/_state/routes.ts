// Route table for the authenticated product.
//
// Before #175 these were `#hash` fragments driven by the prototype's own
// router. They are now real App Router segments under /app; this module is
// the single mapping between the short route ids the 18 screens still use
// internally and the URLs the browser sees.
//
// Deliberately not a client module: route metadata is read by server
// components (per-route `generateMetadata`) as well as by the client router.

// All known routes. Determines whether a route string is valid.
export const ROUTES = [
  'home', 'brands', 'brands-empty', 'assets', 'guides', 'settings',
  'step1', 'step2', 'step3', 'step4', 'step5', 'logo-brief', 'logo-direction', 'logo-type', 'logo-references', 'logo-sketches', 'logo-refine', 'logo-export',
];

// Navigation order. Drives the fwd/back entrance animation only — it is not
// a flow, just the order screens were laid out in.
export const ROUTE_ORDER = [
  'home', 'brands', 'logo-brief', 'logo-direction', 'logo-type', 'logo-references',
  'logo-sketches', 'logo-refine', 'logo-export', 'step1', 'step2', 'step3', 'step4',
  'step5', 'assets', 'guides', 'settings', 'brands-empty',
];

export const DEFAULT_ROUTE = 'home';

/** `/app/logo-brief` for `logo-brief`. */
export function pathForRoute(route: string): string {
  return `/app/${route}`;
}

/** `/app/logo-brief` (or `/app/logo-brief/anything`) back to `logo-brief`. */
export function routeForPath(pathname: string | null): string {
  if (!pathname) return DEFAULT_ROUTE;
  const seg = pathname.replace(/^\/app\/?/, '').split('/')[0];
  return ROUTES.includes(seg) ? seg : DEFAULT_ROUTE;
}

// Left rail label → route.  The rail labels are rendered by the existing
// AShell, so we match by exact text.
export const RAIL_TO_ROUTE = {
  'Home':     'home',
  'Brands':   'brands',
  'Assets':   'assets',
  'Guides':   'guides',
  'Settings': 'settings',
};

// Wizard linear flow
export const WIZARD_NEXT = { step1:'step2', step2:'step3', step3:'step4', step4:'step5', step5:'brands' };

export const WIZARD_PREV = { step2:'step1', step3:'step2', step4:'step3', step5:'step4' };

// Each screen's matching activeNav highlight + breadcrumb override.
export const ROUTE_META = {
  'home':         { activeNav: 'home',     breadcrumb: ['Home'] },
  'brands':       { activeNav: 'brands',   breadcrumb: ['Brands'] },
  'brands-empty': { activeNav: 'brands',   breadcrumb: ['Brands'] },
  'assets':       { activeNav: 'assets',   breadcrumb: ['Assets'] },
  'guides':       { activeNav: 'guides',   breadcrumb: ['Guides'] },
  'settings':     { activeNav: 'settings', breadcrumb: ['Settings'] },
  'logo-brief':   { activeNav: 'brands',   breadcrumb: ['Brands', 'Logo studio'] },
  'logo-direction': { activeNav: 'brands', breadcrumb: ['Brands', 'Logo studio'] },
  'logo-type':    { activeNav: 'brands',   breadcrumb: ['Brands', 'Logo studio'] },
  'logo-references': { activeNav: 'brands',  breadcrumb: ['Brands', 'Logo studio'] },
  'logo-sketches': { activeNav: 'brands',   breadcrumb: ['Brands', 'Logo studio'] },
  'logo-refine':  { activeNav: 'brands',   breadcrumb: ['Brands', 'Logo studio'] },
  'logo-export':  { activeNav: 'brands',   breadcrumb: ['Brands', 'Logo studio'] },
  'step1':        { activeNav: 'brands',   breadcrumb: ['Brands', 'New brand'] },
  'step2':        { activeNav: 'brands',   breadcrumb: ['Brands', 'New brand'] },
  'step3':        { activeNav: 'brands',   breadcrumb: ['Brands', 'New brand'] },
  'step4':        { activeNav: 'brands',   breadcrumb: ['Brands', 'New brand'] },
  'step5':        { activeNav: 'brands',   breadcrumb: ['Brands', 'Brand kit'] },
};

// Per-route <title>, used by each route segment's `metadata` export. The
// hash router had no way to set these; real routes do.
export const ROUTE_TITLE: Record<string, string> = {
  'home':            'Home',
  'brands':          'Brands',
  'brands-empty':    'Brands',
  'assets':          'Assets',
  'guides':          'Guides',
  'settings':        'Settings',
  'step1':           'New brand · Brief',
  'step2':           'New brand · Name',
  'step3':           'New brand · Logo',
  'step4':           'New brand · Style',
  'step5':           'Brand kit',
  'logo-brief':      'Logo studio · Brief',
  'logo-direction':  'Logo studio · Direction',
  'logo-type':       'Logo studio · Type',
  'logo-references': 'Logo studio · References',
  'logo-sketches':   'Logo studio · Concepts',
  'logo-refine':     'Logo studio · Refine',
  'logo-export':     'Logo studio · Export',
};

export const CRUMB_TO_ROUTE = {
  'Home':      'home',
  'Brands':    'brands',
  'Assets':    'assets',
  'Guides':    'guides',
  'Settings':  'settings',
  'Logo studio': 'logo-brief',
  // Inside the wizard, clicking 'New brand' bounces to step1.
  'New brand': 'step1',
};
