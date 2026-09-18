const colors = require("tailwindcss/colors");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
      colors: {
        tremor: {
          brand: {
            faint: colors.blue[50],
            muted: colors.blue[200],
            subtle: colors.blue[400],
            DEFAULT: colors.blue[600],
            emphasis: colors.blue[700],
            inverted: colors.white,
          },
          background: {
            muted: colors.gray[50],
            subtle: colors.gray[100],
            DEFAULT: colors.white,
            emphasis: colors.gray[700],
          },
          border: { DEFAULT: colors.gray[200] },
          ring: { DEFAULT: colors.gray[200] },
          content: {
            subtle: colors.gray[400],
            DEFAULT: colors.gray[500],
            emphasis: colors.gray[700],
            strong: colors.gray[900],
            inverted: colors.white,
          },
        },
        "dark-tremor": {
          brand: {
            faint: "#0B1229",
            muted: colors.blue[950],
            subtle: colors.blue[800],
            DEFAULT: colors.blue[500],
            emphasis: colors.blue[400],
            inverted: colors.blue[950],
          },
          background: {
            muted: "#0c1018",
            subtle: "#182036",
            DEFAULT: "#121a29",
            emphasis: colors.gray[300],
          },
          border: { DEFAULT: "rgba(148,163,184,0.20)" },
          ring: { DEFAULT: "rgba(148,163,184,0.20)" },
          // content.DEFAULT alimenta o texto secundário "de fábrica" de todo
          // componente Tremor (o <Text> de legenda embaixo de cada Title, por
          // exemplo) — gray-500 dava só 3.60:1 contra o fundo dos Cards
          // (#121a29), abaixo do mínimo de 4.5:1 do WCAG AA. slate-400 é a
          // mesma cor já usada nos subtítulos custom (KpiCard/Meter) — unifica
          // a hierarquia de texto secundário do app inteiro numa cor só, com
          // 6.79:1 de contraste.
          content: {
            subtle: colors.gray[600],
            DEFAULT: colors.slate[400],
            emphasis: colors.gray[200],
            strong: colors.gray[50],
            inverted: colors.gray[950],
          },
        },
      },
      boxShadow: {
        "tremor-input": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "tremor-card": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        "tremor-dropdown": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        "dark-tremor-input": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "dark-tremor-card": "0 1px 2px 0 rgb(0 0 0 / 0.3), 0 10px 24px -12px rgb(0 0 0 / 0.55)",
        "dark-tremor-dropdown": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
      },
      borderRadius: {
        "tremor-small": "0.5rem",
        "tremor-default": "0.625rem",
        "tremor-full": "9999px",
      },
      fontSize: {
        "tremor-label": ["0.75rem"],
        "tremor-default": ["0.875rem", { lineHeight: "1.25rem" }],
        "tremor-title": ["1.125rem", { lineHeight: "1.75rem" }],
        "tremor-metric": ["1.875rem", { lineHeight: "2.25rem" }],
      },
    },
  },
  safelist: [
    {
      pattern: /^(bg|text|border|ring)-(tremor|dark-tremor)-(brand|background|border|ring|content)/,
    },
    {
      pattern: /^(bg|text|border|ring|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
    },
  ],
};
