/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        ground: "var(--surface-ground)",
        panel: "var(--surface-panel)",
        "surface-elevated": "var(--surface-elevated)",
        "surface-hover": "var(--surface-hover)",
        "surface-active": "var(--surface-active)",
        "surface-code": "var(--surface-code)",

        hairline: "var(--border-hairline)",
        "border-subtle": "var(--border-subtle)",
        "border-interactive": "var(--border-interactive)",
        "border-focus": "var(--border-focus)",
        subtle: "var(--border-subtle)",
        interactive: "var(--border-interactive)",
        focus: "var(--border-focus)",

        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        "text-accent": "var(--text-accent)",

        "action-primary": "var(--action-primary-bg)",
        "action-hover": "var(--action-primary-hover)",
        "action-ghost-hover": "var(--action-ghost-hover)",
        "on-action": "var(--action-primary-text)",

        "status-added": "var(--status-added-fg)",
        "status-added-bg": "var(--status-added-bg)",
        "status-added-border": "var(--status-added-border)",

        "status-removed": "var(--status-removed-fg)",
        "status-removed-bg": "var(--status-removed-bg)",
        "status-removed-border": "var(--status-removed-border)",

        "status-modified": "var(--status-modified-fg)",
        "status-modified-bg": "var(--status-modified-bg)",
        "status-modified-border": "var(--status-modified-border)",

        "status-strong": "var(--status-strong-fg)",
        "status-strong-bg": "var(--status-strong-bg)",
        "status-strong-border": "var(--status-strong-border)",

        "status-weak": "var(--status-weak-fg)",
        "status-weak-bg": "var(--status-weak-bg)",
        "status-weak-border": "var(--status-weak-border)",

        "status-none": "var(--status-none-fg)",
        "status-none-bg": "var(--status-none-bg)",
        "status-none-border": "var(--status-none-border)",

        "status-uncertain": "var(--status-uncertain-fg)",
        "status-uncertain-bg": "var(--status-uncertain-bg)",
        "status-uncertain-border": "var(--status-uncertain-border)",

        "status-unknown": "var(--status-unknown-fg)",
        "status-unknown-bg": "var(--status-unknown-bg)",
        "status-unknown-border": "var(--status-unknown-border)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans:    ["var(--font-body)"],
        body:    ["var(--font-body)"],
        mono:    ["var(--font-mono)"],
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      spacing: {
        1:  "var(--space-1)",
        2:  "var(--space-2)",
        3:  "var(--space-3)",
        4:  "var(--space-4)",
        6:  "var(--space-6)",
        8:  "var(--space-8)",
        12: "var(--space-12)",
        16: "var(--space-16)",
      },
      transitionTimingFunction: {
        "ui-ease": "var(--ease-out-ui)",
      },
      transitionDuration: {
        fast:   "var(--dur-fast)",
        reveal: "var(--dur-reveal)",
        slow:   "var(--dur-slow)",
      },
    },
  },
  plugins: [],
};
