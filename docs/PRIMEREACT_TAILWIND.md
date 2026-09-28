# Migração PrimeReact → Tailwind (status)

## Build

`npm run build` deve concluir com sucesso (`tsc -b` + `vite build`).

## Arquitetura atual

- **Kit UI:** `src/components/ui/` (Tailwind + Radix headless).
- **Toasts:** `ToasterProvider` em `src/App.tsx` + shim `primereact/toast`.
- **Shims:** imports `primereact/*` (exceto abaixo) resolvem para `src/shims/primereact/*` via alias em `vite.config.ts` e `tsconfig.app.json`.
- **`classNames`:** páginas usam `cn` de `src/lib/cn.ts` (alias de `primereact/utils` foi removido para não quebrar o runtime real do Prime no shell).

## PrimeReact residual (real, não shim)

Mantido até migrar **Layout** e **Cabeçalho** (fora do escopo desta fase):

| Módulo | Onde |
|--------|------|
| `primereact/overlaypanel` | `Layout.tsx`, `CentralAlertas`, `OverlayLimitePlano`, dashboard, `FormCadastroFuncao`, refs em EPI |
| `primereact/menu` | `Cabecalho.tsx` |
| CSS tema | `main.tsx` — Lara Green, `primereact.min.css`, `primeflex`, `primeicons` |

**Não alterar** (plano): `Layout.tsx`, `Cabecalho.tsx`, `cabecalho-app.css`, `layout-responsivo.css`, `sidebar-app.css`.

## Próximo passo

1. Migrar shell (Layout/Cabeçalho/sidebar) para o kit `ui/` ou equivalente.
2. Substituir `OverlayPanel` / `Menu` nas páginas e componentes que ainda importam o módulo real.
3. Remover `primereact`, `primeflex` e `primeicons` do `package.json` e os imports em `main.tsx`.
4. Opcional: trocar imports `primereact/*` nas páginas por `@/components/ui` e remover shims.

## Notas

- CSS da landing: `landingPage.css` é CSS legado; erro de sintaxe em `.modal-logo-bar .brand-icon` foi corrigido para o parser do Tailwind v4.
- Logo `logo_cepi_verde_svg.svg` é exigido por `Layout.tsx`.
