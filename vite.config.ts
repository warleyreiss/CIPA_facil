import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const root = path.dirname(fileURLToPath(import.meta.url));
const shim = (name: string) => path.resolve(root, `src/shims/primereact/${name}`);

/** Map PrimeReact imports to Tailwind UI shims (except overlaypanel — Layout shell). */
const primeAliases: Record<string, string> = {
  'primereact/button': shim('button.ts'),
  'primereact/inputtext': shim('inputtext.ts'),
  'primereact/inputtextarea': shim('inputtextarea.ts'),
  'primereact/password': shim('password.ts'),
  'primereact/floatlabel': shim('floatlabel.tsx'),
  'primereact/dropdown': shim('dropdown.ts'),
  'primereact/multiselect': shim('multiselect.ts'),
  'primereact/dialog': shim('dialog.ts'),
  'primereact/sidebar': shim('sidebar.ts'),
  'primereact/toast': shim('toast.ts'),
  'primereact/tag': shim('tag.ts'),
  'primereact/badge': shim('badge.ts'),
  'primereact/message': shim('message.ts'),
  'primereact/progressbar': shim('progressbar.ts'),
  'primereact/progressspinner': shim('progressspinner.ts'),
  'primereact/divider': shim('divider.ts'),
  'primereact/card': shim('card.ts'),
  'primereact/panel': shim('panel.ts'),
  'primereact/fieldset': shim('fieldset.ts'),
  'primereact/checkbox': shim('checkbox.ts'),
  'primereact/inputswitch': shim('inputswitch.ts'),
  'primereact/selectbutton': shim('selectbutton.ts'),
  'primereact/inputnumber': shim('inputnumber.ts'),
  'primereact/calendar': shim('calendar.ts'),
  'primereact/datatable': shim('datatable.ts'),
  'primereact/column': shim('column.ts'),
  'primereact/steps': shim('steps.ts'),
  'primereact/toolbar': shim('toolbar.ts'),
  'primereact/inputmask': shim('inputmask.ts'),
  'primereact/confirmdialog': shim('confirmdialog.tsx'),
  'primereact/splitbutton': shim('splitbutton.tsx'),
  'primereact/accordion': shim('accordion.tsx'),
  'primereact/avatar': shim('avatar.tsx'),
  'primereact/tooltip': shim('tooltip.ts'),
  'primereact/menuitem': shim('menuitem.ts'),
  'primereact/multistatecheckbox': shim('multistatecheckbox.tsx'),
  'primereact/tabview': shim('tabview.tsx'),
  'primereact/picklist': shim('picklist.tsx'),
  'primereact/radiobutton': shim('radiobutton.tsx'),
  'primereact/inplace': shim('inplace.tsx'),
  'primereact/chart': shim('chart.tsx'),
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: primeAliases,
  },
  optimizeDeps: {
    include: ['file-saver'],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'EVAL' && warning.id?.includes('lottie-web')) return;
        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (
            id.includes('/react-dom/') ||
            id.includes('/react-router') ||
            id.includes('/react/')
          ) {
            return 'vendor-react';
          }
          if (id.includes('primereact') || id.includes('primeicons')) {
            return 'vendor-prime';
          }
          if (id.includes('@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('lottie')) {
            return 'vendor-lottie';
          }
          if (id.includes('exceljs') || id.includes('file-saver')) {
            return 'vendor-excel';
          }
          if (id.includes('aos')) {
            return 'vendor-aos';
          }
          if (id.includes('@emailjs')) {
            return 'vendor-emailjs';
          }
          if (id.includes('cpf-cnpj-validator')) {
            return 'vendor-validation';
          }
        },
      },
    },
  },
});
