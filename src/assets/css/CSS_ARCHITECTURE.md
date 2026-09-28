# Arquitetura CSS — Controle EPI Web

## Entrada global

`src/main.tsx` carrega:

1. `src/index.css` — reset e tipografia base
2. PrimeIcons + Lara theme + primereact.min
3. **`src/assets/css/app.css`** — design system modular

## Estrutura de pastas

```
src/assets/css/
├── app.css
├── raiz/
│   ├── variaveis.css       ← tokens + aliases (sidebar app, tabelas, dark mode)
│   └── base.css            ← reset, scrollbar, focus-visible
├── base/
│   ├── design-system.css   ← Prime overrides (painéis, tooltips)
│   ├── utilities.css
│   └── patterns.css
├── formularios/
│   ├── container.css, field.css, labels.css
│   ├── input.css, dropdown.css, calendar.css, textarea.css
│   ├── input-group.css, checkbox.css, switch.css, radio.css
│   ├── buttons.css, tabView.css, fieldSet.css, picklist.css
│   ├── message.css, divider.css, tag.css, footer.css
│   ├── config.css, lista-scroll.css, validacao-digital.css
│   ├── fluid.css, responsive.css
│   └── form-cadastro-epi.css, form-cadastro-funcao.css
├── sidebar/                ← PrimeReact p-sidebar (formulários laterais)
│   ├── cabecalho.css
│   ├── rodape.css
│   └── larguras.css
├── listas/                 ← padrão tabela-showcase (sharp edges, sem sombra)
│   ├── card.css            ← card-table, container-tabela-full, recursos-adicionais
│   ├── cabecalho.css       ← toolbar, busca, filtros Controle EPI, tiered menu
│   ├── tabelas.css         ← DataTable, colunas, linhas, frozen
│   ├── acoes.css           ← botões toolbar (escopados) + coluna ações
│   ├── celulas.css         ← tags, badges, células especiais
│   ├── rodape.css          ← paginador, empty state, loading
│   ├── movimentacao.css    ← dual split movimentação EPI
│   ├── utilities.css       ← tabela-util-*
│   ├── responsive.css
│   ├── historico-fornecimento.css
│   ├── fornecedores.css
│   ├── consulta-ca-avulsa.css
│   ├── controle-epi-extras.css
│   ├── esocial-tabela.css
│   └── compacta.css
├── modais/
│   ├── modais.css
│   ├── modal-comunicado.css
│   └── modal-confirmar-alteracao.css
└── especificos/            ← visual próprio (import no TSX da página/componente)
    ├── sidebar-app.css     ← menu lateral do app
    ├── cabecalho-app.css, layout-responsivo.css, mobile-nav.css
    └── dashboard.css, suporte.css, perfil.css, esocial.css, …
```

## Camadas (`app.css`)

| Layer | Conteúdo |
|-------|----------|
| `tokens` | `raiz/variaveis.css` |
| `base` | `raiz/base.css`, `base/*` |
| `formularios` | `sidebar/*`, `formularios/*` |
| `listas` | `listas/*` (todos os módulos via `app.css`) |
| `modais` | `modais/modais.css` |

## O que vai onde

| Tipo de CSS | Pasta | Carregamento |
|-------------|-------|--------------|
| Tokens, inputs, botões, picklist… | `formularios/` | Global via `app.css` |
| Painel lateral de form (p-sidebar) | `sidebar/` | Global via `app.css` |
| Tabelas DataTable | `listas/` | Global via `app.css` |
| Dialogs | `modais/` | Global + específicos no TSX |
| Página, shell app, overlay único | `especificos/` | Import no componente |

## Referência visual

| Área | Arquivo de referência |
|------|----------------------|
| Formulários | `ideia_css` → `formularios/` |
| Tabelas | `public/tabela-showcase.html` + `public/tabela-showcase.css` (layout catálogo) |
| Tokens tabela | `--table-head-bg`, `--table-row-hover`, `--table-frozen-shadow` em `raiz/variaveis.css` |

O catálogo de tabelas carrega `app.css` (estilos reais) + `tabela-showcase.css` (somente layout do TOC/seções).

Para alterar tabelas, edite os módulos em `listas/` diretamente. O script `scripts/split-tabela-css.mjs` foi usado na migração inicial.

## Convenções React

### Tabelas
- `TableRowActions`, `header-table`, `button-tabelas`, `p-datatable-custom`
- Botões da toolbar ficam escopados em `acoes.css` (`.header-table .p-button-*`, etc.)

### Formulários
- `formLabel`, `formInput`, `formFooter`, `sidebar-lateral app-form`

### Específicos
- Uma pasta só: `especificos/` (páginas + shell + overlays com visual próprio)
