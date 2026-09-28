/**
 * Classes Tailwind alinhadas ao design system em `assets/css/raiz/base.css`.
 * Use com `cn(cepi.input, className)`.
 */
export const cepi = {
  page: {
    root: 'cepi-page',
    header: 'cepi-page__header',
    title: 'cepi-page__title',
    subtitle: 'cepi-page__subtitle',
    actions: 'cepi-page__actions',
    body: 'cepi-page__body',
    section: 'cepi-page__section',
  },
  btn: {
    base: 'cepi-btn inline-flex items-center justify-center gap-2 font-semibold transition-[background,border-color,color,box-shadow,transform] duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
    sm: 'cepi-btn--sm',
    md: 'cepi-btn--md',
    lg: 'cepi-btn--lg',
    primary: 'cepi-btn--primary',
    secondary: 'cepi-btn--secondary',
    outline: 'cepi-btn--outline',
    ghost: 'cepi-btn--ghost',
    danger: 'cepi-btn--danger',
    text: 'cepi-btn--text',
    icon: 'cepi-btn--icon',
  },
  control: {
    input:
      'cepi-control flex h-[var(--fh)] w-full rounded-[var(--fr)] border border-border bg-surface px-3 text-[length:var(--ffs)] text-text-1 outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-text-4 hover:border-border-hover focus:border-green focus:shadow-none disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-60',
    textarea:
      'cepi-control cepi-control--textarea min-h-[5rem] resize-y py-2',
    invalid: 'cepi-control--invalid border-danger focus:border-danger focus:shadow-none',
  },
  card: {
    root: 'cepi-card',
    header: 'cepi-card__header',
    body: 'cepi-card__body',
    footer: 'cepi-card__footer',
    flush: 'cepi-card--flush',
  },
  table: {
    shell: 'cepi-table-shell flex min-h-0 flex-1 flex-col',
    toolbar: 'cepi-table-toolbar',
    table: 'cepi-table w-full border-collapse',
    thead: 'cepi-table__head',
    th: 'cepi-table__th',
    td: 'cepi-table__td',
    row: 'cepi-table__row',
    empty: 'cepi-table__empty',
    footer: 'cepi-table__footer',
  },
  modal: {
    overlay: 'cepi-modal-overlay fixed inset-0 z-[1100]',
    content: 'cepi-modal fixed z-[1101] flex max-h-[90vh] flex-col overflow-hidden',
    header: 'cepi-modal__header',
    body: 'cepi-modal__body',
    footer: 'cepi-modal__footer',
  },
  sheet: {
    root: 'cepi-sheet fixed inset-y-0 z-[1101] flex h-dvh max-h-dvh flex-col bg-surface shadow-[var(--cepi-shadow-modal)] focus:outline-none',
  },
  form: {
    root: 'cepi-form',
    grid: 'cepi-form__grid',
    actions: 'cepi-form__actions',
    hint: 'cepi-form__hint',
    error: 'cepi-form__error',
  },
} as const;
