# Graph Report - transportes-gm  (2026-07-06)

## Corpus Check
- 170 files · ~379,456 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1992 nodes · 2019 edges · 135 communities (99 shown, 36 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 63 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a3e2b8ba`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 110|Community 110]]
- [[_COMMUNITY_Community 111|Community 111]]
- [[_COMMUNITY_Community 114|Community 114]]
- [[_COMMUNITY_Community 115|Community 115]]
- [[_COMMUNITY_Community 116|Community 116]]
- [[_COMMUNITY_Community 117|Community 117]]
- [[_COMMUNITY_Community 118|Community 118]]
- [[_COMMUNITY_Community 119|Community 119]]
- [[_COMMUNITY_Community 120|Community 120]]
- [[_COMMUNITY_Community 121|Community 121]]
- [[_COMMUNITY_Community 122|Community 122]]
- [[_COMMUNITY_Community 123|Community 123]]
- [[_COMMUNITY_Community 124|Community 124]]
- [[_COMMUNITY_Community 125|Community 125]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 27 edges
2. `fetch()` - 20 edges
3. `compilerOptions` - 16 edges
4. `UI/UX Pro Max - Design Intelligence` - 13 edges
5. `str` - 12 edges
6. `DesignSystemGenerator` - 11 edges
7. `useToast()` - 10 edges
8. `generate_design_system()` - 9 edges
9. `Quick Reference` - 9 edges
10. `_search_csv()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `wialonFetch()` --calls--> `fetch()`  [INFERRED]
  src/lib/wialonFetch.js → cloudflare-workers/wialon-proxy/src/index.ts
- `wialonGetHistory()` --calls--> `fetch()`  [INFERRED]
  supabase/functions/wialon-proxy/index.ts → cloudflare-workers/wialon-proxy/src/index.ts
- `wialonGetUnits()` --calls--> `fetch()`  [INFERRED]
  supabase/functions/wialon-proxy/index.ts → cloudflare-workers/wialon-proxy/src/index.ts
- `wialonLogin()` --calls--> `fetch()`  [INFERRED]
  supabase/functions/wialon-proxy/index.ts → cloudflare-workers/wialon-proxy/src/index.ts
- `wialonLogout()` --calls--> `fetch()`  [INFERRED]
  supabase/functions/wialon-proxy/index.ts → cloudflare-workers/wialon-proxy/src/index.ts

## Communities (135 total, 36 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.00
Nodes (964): AbortController, AbortSignal, Ai, Ai_Cf_Ai4Bharat_Indictrans2_En_Indic_1B_Input, Ai_Cf_Ai4Bharat_Indictrans2_En_Indic_1B_Output, Ai_Cf_Aisingapore_Gemma_Sea_Lion_V4_27B_It_Async_Batch, Ai_Cf_Aisingapore_Gemma_Sea_Lion_V4_27B_It_AsyncResponse, Ai_Cf_Aisingapore_Gemma_Sea_Lion_V4_27B_It_Chat_Completion_Response (+956 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (62): dependencies, @base44/sdk, class-variance-authority, clsx, cmdk, date-fns, embla-carousel-react, framer-motion (+54 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (42): bool, BM25, detect_domain(), _load_csv(), Lowercase, split, remove punctuation, filter short words, Build BM25 index from documents, Score all documents against query, Load CSV and return list of dicts (+34 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (39): Autorizacion, autorizar(), corsHeaders, distanciaMetros(), ejecutarGeocerca(), ejecutarRalenti(), Env, esCuentaCliente() (+31 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (17): DURACIONES_SHARE, fetchHistory(), HistorialGPS(), toDatetimeLocal(), today, yesterday, fetchWialonUnits(), wialonFetch() (+9 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (25): Sidebar, SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel (+17 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (26): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-react-refresh, @flydotio/dockerfile (+18 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (10): DefaultIcon, endIcon, excesoIcon, FILTROS_RUTA, MapaGPS(), startIcon, TRIP_COLORS, createUnitIcon() (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (10): Clientes(), CuentasCliente(), EditDialog(), FuelCamiones(), FuelConductores(), FuelRemolques(), EMPTY_ARRAY, Liquidaciones() (+2 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, allowSyntheticDefaultImports, checkJs, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+10 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (3): _getCurrentPage(), Pages, PagesContent()

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (12): LiquidButton(), cn(), Pagination(), PaginationContent, PaginationEllipsis(), PaginationItem, PaginationLink(), PaginationNext() (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (15): devDependencies, @cloudflare/vitest-pool-workers, @types/node, typescript, vitest, wrangler, name, private (+7 more)

### Community 15 - "Community 15"
Cohesion: 0.16
Nodes (7): CAMION_FIELDS, CONDUCTOR_FIELDS, getBadgeClasses(), getBadgeLabel(), getEstadoVencimiento(), REMOLQUE_FIELDS, StatusBadge()

### Community 16 - "Community 16"
Cohesion: 0.16
Nodes (6): CENTRO_MX, estaEnRalenti(), tiempoDesde(), TooltipUnidad(), localDateStr(), PortalCliente()

### Community 17 - "Community 17"
Cohesion: 0.20
Nodes (9): addDays(), ControlVacios(), DIAS_SEMANA, ESTATUS_VACIOS, FORM_VACIO, getEstatus(), getLunes(), localDateStr() (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (8): ESTADOS, FORM_VACIO, formatearFechaWialon(), formatMXN(), LINEA_VACIA, OrdenesTrabajoTab(), STEP_LABELS, TIPOS

### Community 19 - "Community 19"
Cohesion: 0.15
Nodes (8): Home(), staticWebsiteInfo, Layout(), Unidades(), ColaCargaCompacta(), DIA_CORTO, DIAS_SEMANA, createPageUrl()

### Community 20 - "Community 20"
Cohesion: 0.17
Nodes (6): ModeToggle(), ThemeProviderContext, useTheme(), GraficoConsumo(), GraficoEficiencia(), Toaster()

### Community 21 - "Community 21"
Cohesion: 0.17
Nodes (10): admin, body, corsHeaders, desdeEpoch, filtradas, from, idsPermitidos, to (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.17
Nodes (12): code:bash (python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" -), code:bash (python3 skills/ui-ux-pro-max/scripts/search.py "<product_typ), code:bash (python3 skills/ui-ux-pro-max/scripts/search.py "beauty spa w), code:bash (python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --d), code:bash (python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --d), code:bash (python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" -), How to Use This Skill, Step 1: Analyze User Requirements (+4 more)

### Community 23 - "Community 23"
Cohesion: 0.22
Nodes (4): DIAS_SEMANA, PLANTILLA_VACIA, SYSTEM_PAGES, TrailerIcon()

### Community 24 - "Community 24"
Cohesion: 0.25
Nodes (9): actionTypes, addToRemoveQueue(), dispatch(), genId(), listeners, memoryState, reducer(), toast() (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.18
Nodes (9): action, admin, corsHeaders, { cuenta_id, activo }, { cuenta_id, password }, { cuenta_id, unidades }, { email, password, nombre, cliente_id, unidades }, result (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.18
Nodes (10): Available Domains, Available Stacks, code:bash (# ASCII box (default) - best for terminal display), How to Use, Output Formats, Rule Categories by Priority, Search Reference, Tips for Better Results (+2 more)

### Community 27 - "Community 27"
Cohesion: 0.20
Nodes (7): FormControl, FormDescription, FormFieldContext, FormItem, FormItemContext, FormLabel, FormMessage

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (8): companyV, corsJson, emailOk, emailV, messageV, nameV, phoneV, RESEND_API_KEY

### Community 29 - "Community 29"
Cohesion: 0.20
Nodes (8): Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut()

### Community 30 - "Community 30"
Cohesion: 0.20
Nodes (9): ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut(), ContextMenuSubContent (+1 more)

### Community 31 - "Community 31"
Cohesion: 0.20
Nodes (9): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut(), DropdownMenuSubContent (+1 more)

### Community 32 - "Community 32"
Cohesion: 0.28
Nodes (4): DashboardMantenimiento(), ESTADOS, formatFecha(), formatMXN()

### Community 33 - "Community 33"
Cohesion: 0.22
Nodes (3): CATEGORIAS, FORM_VACIO, LINEA_VACIA

### Community 34 - "Community 34"
Cohesion: 0.22
Nodes (5): ChartContainer, ChartContext, ChartLegendContent, ChartTooltipContent, THEMES

### Community 35 - "Community 35"
Cohesion: 0.22
Nodes (8): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow

### Community 36 - "Community 36"
Cohesion: 0.22
Nodes (8): AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay, AlertDialogTitle

### Community 37 - "Community 37"
Cohesion: 0.22
Nodes (8): Toast, ToastAction, ToastClose, ToastDescription, ToastProvider, ToastTitle, toastVariants, ToastViewport

### Community 38 - "Community 38"
Cohesion: 0.22
Nodes (9): 1. Accessibility (CRITICAL), 2. Touch & Interaction (CRITICAL), 3. Performance (HIGH), 4. Layout & Responsive (HIGH), 5. Typography & Color (MEDIUM), 6. Animation (MEDIUM), 7. Style Selection (MEDIUM), 8. Charts & Data (LOW) (+1 more)

### Community 40 - "Community 40"
Cohesion: 0.25
Nodes (6): Carousel, CarouselContent, CarouselContext, CarouselItem, CarouselNext, CarouselPrevious

### Community 41 - "Community 41"
Cohesion: 0.25
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 42 - "Community 42"
Cohesion: 0.25
Nodes (7): SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger

### Community 43 - "Community 43"
Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 44 - "Community 44"
Cohesion: 0.25
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 45 - "Community 45"
Cohesion: 0.25
Nodes (7): SheetContent, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants

### Community 46 - "Community 46"
Cohesion: 0.25
Nodes (8): code:bash (python3 skills/ui-ux-pro-max/scripts/search.py "beauty spa w), code:bash (# Get UX guidelines for animation and accessibility), code:bash (python3 skills/ui-ux-pro-max/scripts/search.py "layout respo), Example Workflow, Step 1: Analyze Requirements, Step 2: Generate Design System (REQUIRED), Step 3: Supplement with Detailed Searches (as needed), Step 4: Stack Guidelines

### Community 47 - "Community 47"
Cohesion: 0.25
Nodes (7): Best Practices (conditional), Cloudflare Workers, Commands, Docs, Errors, Node.js Compatibility, Product Docs

### Community 49 - "Community 49"
Cohesion: 0.29
Nodes (6): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle

### Community 50 - "Community 50"
Cohesion: 0.33
Nodes (3): DefaultIcon, fmtFecha(), HistorialPublico()

### Community 51 - "Community 51"
Cohesion: 0.29
Nodes (6): compilerOptions, baseUrl, jsx, paths, include, @/*

### Community 52 - "Community 52"
Cohesion: 0.29
Nodes (6): DialogContent, DialogDescription, DialogFooter(), DialogHeader(), DialogOverlay, DialogTitle

### Community 53 - "Community 53"
Cohesion: 0.47
Nodes (4): fmtFecha(), generarDatosMock(), REPORTES, ReportesGPS()

### Community 55 - "Community 55"
Cohesion: 0.33
Nodes (5): compilerOptions, types, exclude, extends, include

### Community 56 - "Community 56"
Cohesion: 0.33
Nodes (6): Accessibility, Interaction, Layout, Light/Dark Mode, Pre-Delivery Checklist, Visual Quality

### Community 57 - "Community 57"
Cohesion: 0.40
Nodes (4): hooks, PostToolUse, PreToolUse, SessionStart

### Community 58 - "Community 58"
Cohesion: 0.40
Nodes (4): enableAllProjectMcpServers, enabledMcpjsonServers, permissions, allow

### Community 59 - "Community 59"
Cohesion: 0.40
Nodes (4): Debug Issue, Steps, Tips, Token Efficiency Rules

### Community 60 - "Community 60"
Cohesion: 0.40
Nodes (4): Output Format, Review Changes, Steps, Token Efficiency Rules

### Community 61 - "Community 61"
Cohesion: 0.40
Nodes (4): Explore Codebase, Steps, Tips, Token Efficiency Rules

### Community 65 - "Community 65"
Cohesion: 0.40
Nodes (4): Refactor Safely, Safety Checks, Steps, Token Efficiency Rules

### Community 66 - "Community 66"
Cohesion: 0.40
Nodes (4): Alert, AlertDescription, AlertTitle, alertVariants

### Community 67 - "Community 67"
Cohesion: 0.40
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 70 - "Community 70"
Cohesion: 0.40
Nodes (4): ICON_SPRING, MAGNETIC_SPRING, MagneticButton(), SWEEP_EASE

### Community 71 - "Community 71"
Cohesion: 0.40
Nodes (3): Button, buttonVariants, Calendar()

### Community 72 - "Community 72"
Cohesion: 0.40
Nodes (5): Common Rules for Professional UI, Icons & Visual Elements, Interaction & Cursor, Layout & Spacing, Light/Dark Mode Contrast

### Community 73 - "Community 73"
Cohesion: 0.40
Nodes (5): code:bash (python3 --version || python --version), code:bash (brew install python3), code:bash (sudo apt update && sudo apt install python3), code:powershell (winget install Python.Python.3.12), Prerequisites

### Community 76 - "Community 76"
Cohesion: 0.50
Nodes (3): AccordionContent, AccordionItem, AccordionTrigger

### Community 77 - "Community 77"
Cohesion: 0.50
Nodes (3): Avatar, AvatarFallback, AvatarImage

### Community 78 - "Community 78"
Cohesion: 0.50
Nodes (3): TabsContent, TabsList, TabsTrigger

### Community 80 - "Community 80"
Cohesion: 0.50
Nodes (3): ToggleGroup, ToggleGroupContext, ToggleGroupItem

## Knowledge Gaps
- **1453 isolated node(s):** `C:\Users\Joker\AppData\Local\Programs\Python\Python314\python.exe`, `$schema`, `style`, `rsc`, `tsx` (+1448 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `wialonFetch()` connect `Community 4` to `Community 3`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `fetch()` connect `Community 3` to `Community 4`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Are the 26 inferred relationships involving `cn()` (e.g. with `LiquidButton()` and `MagneticButton()`) actually correct?**
  _`cn()` has 26 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `fetch()` (e.g. with `wialonFetch()` and `wialonGetHistory()`) actually correct?**
  _`fetch()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `C:\Users\Joker\AppData\Local\Programs\Python\Python314\python.exe`, `$schema`, `style` to the rest of the system?**
  _1479 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.002072538860103627 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.03225806451612903 - nodes in this community are weakly interconnected._