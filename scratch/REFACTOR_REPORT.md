# Reporte de Refactorización — Transportes GM
**Fecha:** 2026-05-15
**Estado del Build:** EXITOSO

---

## Resumen por Subagente

### Subagente 1 — Landing Page (Home.jsx)
**Archivos modificados:**
- `src/pages/Home.jsx` — Refactorización completa del componente. Se extrajeron constantes (`LOGO_URL`, `WHATSAPP_URL`, `NAV_LINKS`), se reemplazó el navbar anterior por un "pill nav" flotante con backdrop blur, se refactorizó el footer en 4 columnas con mapa embebido, se agregó el componente `LogoLoop` para el carrusel de clientes, y se integró el componente `Antigravity` en el hero. Se importa pero no se usa en el JSX: `QuoteForm` (importado, nunca renderizado), `Shield`, `Users`, `Gauge` (íconos importados sin uso), `observers` (array inicializado pero vacío), `StatCounter` (función definida al final del archivo pero nunca llamada en el return).
- `src/styles/home.css` — CREADO. Contiene estilos para `.force-light`, `.scroll-indicator`, `.mouse`, `.wheel`, `.floating-whatsapp`, `.floating-shape` y la keyframe `@keyframes float`.
- `src/components/fuel/QuoteForm.jsx` — CREADO. Formulario de cotización con campos nombre, email, teléfono, empresa y mensaje. Llama a `supabase.functions.invoke('contact-form')`. Importado en Home.jsx pero no renderizado en el JSX actual (la sección cotizar usa solo el botón de WhatsApp).

**Cambios realizados:**
- Navbar convertido a "pill" flotante con glassmorphism (`rgba(10,10,10,0.75)` + `backdrop-filter: blur(24px)`)
- Mobile menu drawer debajo del pill (AnimatePresence)
- Hero con video background + overlay + capa `Antigravity` interactiva
- `SplitText` y `TextType` para animaciones del título y subtítulo
- Sección de clientes con `LogoLoop` (carrusel animado)
- Sección cotizar simplificada a un solo card WhatsApp (sin el formulario)
- Footer en 4 columnas: Logo+contacto, Navegación, Servicios, Mapa embebido
- Botón flotante de WhatsApp animado en esquina inferior
- Clase `force-light` para bloquear dark mode en la landing

---

### Subagente 2 — Módulos ERP (src/pages/)
**Archivos modificados:**
- `src/App.jsx` — `FuelProgramaCargas` importado pero nunca usado (línea 5)
- `src/pages/ControlCombustible.jsx` — `React` importado pero no usado (línea 1)
- `src/pages/DocumentacionLegal.jsx` — imports no usados: `es`, `Badge`, `CardHeader`, `CardTitle`; variables `e` capturadas pero no usadas (líneas 56, 89)
- `src/pages/ExpertoLogistica.jsx` — `React` no usado; escapes innecesarios en regex (línea 103); `e` no usado (línea 333)
- `src/pages/FuelCamiones.jsx` — `React` no usado; `AlertDialogAction` importado sin uso
- `src/pages/FuelConductores.jsx` — `React` no usado; `AlertDialogAction` importado sin uso; `stats` asignado sin uso (línea 418)
- `src/pages/FuelProgramaCargas.jsx` — `React` y `useEffect` no usados; íconos `Package`, `CheckCircle2`, `Brain`, `Download` importados sin uso
- `src/pages/IAAuditorChat.jsx` — `React` no usado
- `src/pages/Layout.jsx` — N/A (sin errores)
- `src/pages/Liquidaciones.jsx` — `React` no usado; `loadingProgramas` y `loadingViajes` asignados sin uso (líneas 61, 111)
- `src/pages/Login.jsx` — `React` no usado; `error` en catch no usado (línea 39)
- `src/pages/ProtectedRoute.jsx` — `React` no usado
- `src/pages/Unidades.jsx` — `React`, `useState`, `useEffect` no usados; `CreditCard` importado sin uso

**Cambios realizados:**
- N/A (los errores son pre-existentes o resultado de refactorizaciones parciales que dejaron imports sin limpiar)

---

### Subagente 3 — Componentes Compartidos (src/components/)
**Archivos modificados:**
- `src/components/fuel/QuoteForm.jsx` — CREADO (ver Subagente 1)
- Componentes en `src/components/fuel/` que existen en el directorio: `AnomaliasCombustible.jsx`, `ColaCarga.jsx`, `FiltrosViajes.jsx`, `GraficoConsumo.jsx`, `GraficoEficiencia.jsx`, `RankingConductores.jsx`, `StatsCard.jsx`, `TablaViajes.jsx`

**Componentes marcados como UNUSED:**
- No se encontraron comentarios `// UNUSED` en los archivos. Los componentes de `src/components/fuel/` existen pero se deberá verificar cuáles son importados por páginas activas y cuáles ya no se usan.

---

### Subagente 4 — Configuración
**Archivos modificados:**
- `tailwind.config.js` — Se agregaron 4 tokens de color al objeto `extend.colors`:
  - `gm-primary: '#EAB308'` (amarillo principal)
  - `gm-dark: '#0A0A0A'` (negro oscuro)
  - `gm-surface: '#1F2937'` (gris oscuro)
  - `gm-muted: 'rgba(255,255,255,0.45)'` (blanco translúcido)
- `CLAUDE.md` — Sección de contexto del proyecto confirmada y actualizada
- `scratch/archive/` — Archivados `check_db_v2.cjs` y `check_db_v3.cjs` con su `README.md` explicativo. Archivados el 2026-05-15.

---

## Estado del Lint

**Comando:** `npm run lint`
**Total:** 685 problemas (674 errores, 11 warnings)

> **Nota importante:** La gran mayoría de errores (aprox. 580+) provienen de `react/prop-types` en `src/components/ui/` (shadcn/ui). Estos son archivos autogenerados que NO deben modificarse manualmente. Son pre-existentes y no son consecuencia de la refactorización.

### Errores en archivos de código fuente (no-ui, no-prop-types) — Accionables:

**scratch/test.js**
- `12:21` — `'process' is not defined` (no-undef)
- `13:21` — `'process' is not defined` (no-undef)

**src/App.jsx**
- `5:8` — `'FuelProgramaCargas' is defined but never used` (no-unused-vars)

**src/components/Antigravity.jsx**
- `17:3` — `'color' is assigned a value but never used` (no-unused-vars)

**src/components/LiquidEther.jsx**
- `1002:18` — `'e' is defined but never used` (no-unused-vars)
- `1082:18` — `'e' is defined but never used` (no-unused-vars)
- `1089:18` — `'e' is defined but never used` (no-unused-vars)

**src/components/SplitText.jsx**
- `51:54` — `'_' is defined but never used` (no-unused-vars)
- `51:57` — Empty block statement (no-empty)
- `103:48` — `'_' is defined but never used` (no-unused-vars)
- `103:51` — Empty block statement (no-empty)

**src/components/fuel/ColaCarga.jsx**
- `241:13` — `'fechaInicio' is assigned a value but never used` (no-unused-vars)
- `244:33` — `'indexDia' is defined but never used` (no-unused-vars)

**src/components/fuel/QuoteForm.jsx**
- `1:8` — `'React' is defined but never used` (no-unused-vars)

**src/components/fuel/RankingConductores.jsx**
- `116:32` — `'i' is defined but never used` (no-unused-vars)

**src/pages/Home.jsx**
- `1:8` — `'React' is defined but never used` (no-unused-vars)
- `11:3` — `'Shield' is defined but never used` (no-unused-vars)
- `13:3` — `'Users' is defined but never used` (no-unused-vars)
- `17:3` — `'Gauge' is defined but never used` (no-unused-vars)
- `29:8` — `'QuoteForm' is defined but never used` (no-unused-vars)
- `110:11` — `'observers' is assigned a value but never used` (no-unused-vars)
- `1327:10` — `'StatCounter' is defined but never used` (no-unused-vars)

**src/pages/ControlCombustible.jsx**
- `1:8` — `'React' is defined but never used` (no-unused-vars)

**src/pages/DocumentacionLegal.jsx**
- `5:10` — `'es' is defined but never used` (no-unused-vars)
- `21:10` — `'Badge' is defined but never used` (no-unused-vars)
- `43:29` — `'CardHeader' is defined but never used` (no-unused-vars)
- `43:41` — `'CardTitle' is defined but never used` (no-unused-vars)
- `56:12` — `'e' is defined but never used` (no-unused-vars)
- `89:12` — `'e' is defined but never used` (no-unused-vars)

**src/pages/ExpertoLogistica.jsx**
- `1:8` — `'React' is defined but never used` (no-unused-vars)
- `103:13` — Unnecessary escape character `\-` (no-useless-escape)
- `103:62` — Unnecessary escape character `\-` (no-useless-escape)
- `333:14` — `'e' is defined but never used` (no-unused-vars)

**src/pages/FuelCamiones.jsx**
- `1:8` — `'React' is defined but never used` (no-unused-vars)
- `17:3` — `'AlertDialogAction' is defined but never used` (no-unused-vars)

**src/pages/FuelConductores.jsx**
- `1:8` — `'React' is defined but never used` (no-unused-vars)
- `17:3` — `'AlertDialogAction' is defined but never used` (no-unused-vars)
- `418:29` — `'stats' is assigned a value but never used` (no-unused-vars)

**src/pages/FuelProgramaCargas.jsx**
- `1:8` — `'React' is defined but never used` (no-unused-vars)
- `1:27` — `'useEffect' is defined but never used` (no-unused-vars)
- `45:3` — `'Package' is defined but never used` (no-unused-vars)
- `49:3` — `'CheckCircle2' is defined but never used` (no-unused-vars)
- `50:3` — `'Brain' is defined but never used` (no-unused-vars)
- `51:3` — `'Download' is defined but never used` (no-unused-vars)

**src/pages/IAAuditorChat.jsx**
- `1:8` — `'React' is defined but never used` (no-unused-vars)

**src/pages/Liquidaciones.jsx**
- `1:8` — `'React' is defined but never used` (no-unused-vars)
- `61:53` — `'loadingProgramas' is assigned a value but never used` (no-unused-vars)
- `111:58` — `'loadingViajes' is assigned a value but never used` (no-unused-vars)

**src/pages/Login.jsx**
- `1:8` — `'React' is defined but never used` (no-unused-vars)
- `39:14` — `'error' is defined but never used` (no-unused-vars)

**src/pages/ProtectedRoute.jsx**
- `1:8` — `'React' is defined but never used` (no-unused-vars)

**src/pages/Unidades.jsx**
- `1:8` — `'React' is defined but never used` (no-unused-vars)
- `1:17` — `'useState' is defined but never used` (no-unused-vars)
- `1:27` — `'useEffect' is defined but never used` (no-unused-vars)
- `9:38` — `'CreditCard' is defined but never used` (no-unused-vars)

**tailwind.config.js**
- `2:1` — `'module' is not defined` (no-undef) — Es un archivo CommonJS, ESLint no reconoce `module`
- `92:13` — `'require' is not defined` (no-undef) — Mismo motivo (CommonJS)

**vite.config.js**
- `13:25` — `'__dirname' is not defined` (no-undef) — Node.js global en contexto ESM; pre-existente

### Warnings:

**src/components/TextType.jsx**
- `115:6` — `React Hook useEffect has a missing dependency: 'getRandomSpeed'` (react-hooks/exhaustive-deps)

**src/components/theme-provider.jsx**
- `56:14` — Fast refresh: file exports non-components (react-refresh/only-export-components)

**src/components/ui/badge.jsx**
- `34:17` — Fast refresh: file exports non-components (react-refresh/only-export-components)

**src/components/ui/button.jsx**
- `48:18` — Fast refresh: file exports non-components (react-refresh/only-export-components)

**src/pages/ExpertoLogistica.jsx**
- `306:6` — `React Hook useEffect has a missing dependency: 'messages.length'` (react-hooks/exhaustive-deps)

*(Más warnings en otros archivos ui/ — todos son fast-refresh/only-export-components en shadcn autogenerados)*

---

## Estado del Build

**Comando:** `npm run build`
**Resultado:** EXITOSO

El build de producción completó correctamente en 13.84s. Se generaron los siguientes bundles:

- `dist/assets/index-CwZC701v.js` — 2,721.71 kB (789.51 kB gzip) — **ADVERTENCIA: chunk muy grande**
- `dist/assets/index-DWQLewLe.css` — 136.77 kB (21.43 kB gzip)
- `dist/assets/html2canvas.esm-QH1iLAAe.js` — 202.38 kB
- `dist/assets/index.es-DmPhYVzr.js` — 159.60 kB

Vite emitió una advertencia de tamaño de chunk (>500 kB), pero NO es un error que impida el build.

**No se aplicaron fixes** — el build pasó sin intervención.

---

## Items para Revisión Manual

### QuoteForm importado pero no renderizado en Home.jsx

`QuoteForm` fue creado en `src/components/fuel/QuoteForm.jsx` e importado en `Home.jsx` (línea 29), pero **nunca se renderiza** en el JSX. La sección "cotizar" actual usa solo un card con botón de WhatsApp. Hay dos opciones:

> Acción sugerida: Si el formulario de contacto será implementado, agrégalo al JSX en la sección `id="cotizar"`. Si se decidió eliminar el formulario, borra el import de QuoteForm en Home.jsx y considera eliminar el archivo `QuoteForm.jsx`.

### StatCounter definido pero no usado en Home.jsx

`StatCounter` es un componente completo (con animación de conteo y `useInView`) definido al final de `Home.jsx` (línea 1327) pero nunca invocado en el return.

> Acción sugerida: Si se planea una sección de estadísticas (ej. "500+ viajes", "15 años"), agrega esa sección al JSX y usa `<StatCounter>`. Si no, elimina la función para limpiar el archivo.

### Imports no usados en Home.jsx

`Shield`, `Users`, `Gauge` (líneas 11, 13, 17) son íconos importados de lucide-react que quedaron de una versión anterior del Home.

> Acción sugerida: Eliminar esos tres imports de la línea de importación.

### tailwind.config.js y vite.config.js — errores no-undef

Los errores `'module' is not defined`, `'require' is not defined`, y `'__dirname' is not defined` son pre-existentes y causados por que ESLint trata estos archivos de configuración (CommonJS/Node) con reglas de ESM browser. **No son un problema real** — el build funciona correctamente.

> Acción sugerida: Agregar al `.eslintrc` una regla `overrides` para `tailwind.config.js` y `vite.config.js` que habilite `env: { node: true }`. O agregar comentarios `/* eslint-env node */` al inicio de esos archivos.

### scratch/test.js — `process` no definido

`scratch/test.js` contiene código Node.js que usa `process.env`. ESLint lo escanea y reporta error porque no reconoce el entorno Node.

> Acción sugerida: Agregar `scratch/` al `.eslintignore`, o agregar un comentario `/* eslint-env node */` al inicio del archivo.

### Componentes fuel/ — verificar uso activo

Los siguientes componentes en `src/components/fuel/` no tienen marcadores explícitos de UNUSED pero deben verificarse:
- `AnomaliasCombustible.jsx`
- `ColaCarga.jsx` (tiene 2 errores de no-unused-vars en variables internas)
- `FiltrosViajes.jsx`
- `GraficoConsumo.jsx`
- `GraficoEficiencia.jsx`
- `RankingConductores.jsx` (tiene 1 error: `'i' is defined but never used`)
- `StatsCard.jsx`
- `TablaViajes.jsx`

> Acción sugerida: Verificar en `ControlCombustible.jsx` y demás páginas cuáles de estos componentes se importan realmente. Los que no se usen pueden archivarse o eliminarse.

### Errores de lint pendientes que NO se corrigieron automáticamente

Los errores de `no-unused-vars` son seguros de corregir manualmente (solo eliminar imports), pero no se modificó ningún archivo de código fuente según las instrucciones de este agente. El desarrollador debe revisarlos antes del siguiente despliegue si quiere un lint limpio.

---

## Próximos Pasos Sugeridos

1. **Usar los nuevos tokens de color**: Los tokens `gm-primary`, `gm-dark`, `gm-surface`, `gm-muted` ya están en `tailwind.config.js`. Reemplazar los colores hardcodeados `#EAB308`, `#0A0A0A`, `#1F2937` en `Home.jsx` y demás páginas con `bg-gm-primary`, `text-gm-dark`, etc.

2. **Limpiar imports no usados**: Ejecutar `npm run lint -- --fix` para auto-corregir los 4 errores fixables, luego eliminar manualmente los imports de íconos y componentes no usados en `Home.jsx`, `DocumentacionLegal.jsx`, `FuelProgramaCargas.jsx`, y `Unidades.jsx`.

3. **Decidir el destino de QuoteForm**: O integrarlo en la sección cotizar de Home, o eliminarlo junto con su import.

4. **Decidir el destino de StatCounter**: O integrarlo en una sección de estadísticas en Home, o eliminarlo.

5. **Excluir scratch/ del lint**: Agregar `scratch/` a `.eslintignore` para evitar falsos positivos de scripts Node.js.

6. **Optimizar el bundle**: El chunk principal de 2.7 MB es grande. Considerar code-splitting con `import()` dinámico para los módulos ERP pesados (Liquidaciones, ExpertoLogistica, IAAuditorChat).

7. **Activar la Edge Function `contact-form`**: `QuoteForm.jsx` llama a `supabase.functions.invoke('contact-form')` pero esa Edge Function no existe aún. Si se decide usar el formulario, crear la función en Supabase.

8. **Alertas de documentación por vencer**: Según CLAUDE.md, el próximo paso es agregar alertas cuando un documento esté a <30 días de vencer en `DocumentacionLegal.jsx`.
