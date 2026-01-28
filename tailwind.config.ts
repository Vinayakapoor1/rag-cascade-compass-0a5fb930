import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Geist Sans", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // RAG Colors (Performance Status)
        rag: {
          green: "hsl(var(--rag-green))",
          "green-foreground": "hsl(var(--rag-green-foreground))",
          "green-muted": "hsl(var(--rag-green-muted))",
          amber: "hsl(var(--rag-amber))",
          "amber-foreground": "hsl(var(--rag-amber-foreground))",
          "amber-muted": "hsl(var(--rag-amber-muted))",
          red: "hsl(var(--rag-red))",
          "red-foreground": "hsl(var(--rag-red-foreground))",
          "red-muted": "hsl(var(--rag-red-muted))",
          "not-set": "hsl(var(--rag-not-set))",
          "not-set-foreground": "hsl(var(--rag-not-set-foreground))",
          "not-set-muted": "hsl(var(--rag-not-set-muted))",
        },
        // Org Objective Identity Colors
        org: {
          green: "hsl(var(--org-green))",
          "green-muted": "hsl(var(--org-green-muted))",
          purple: "hsl(var(--org-purple))",
          "purple-muted": "hsl(var(--org-purple-muted))",
          blue: "hsl(var(--org-blue))",
          "blue-muted": "hsl(var(--org-blue-muted))",
          yellow: "hsl(var(--org-yellow))",
          "yellow-muted": "hsl(var(--org-yellow-muted))",
          orange: "hsl(var(--org-orange))",
          "orange-muted": "hsl(var(--org-orange-muted))",
        },
        // Indicator Tier Colors
        tier: {
          1: "hsl(var(--tier-1))",
          "1-muted": "hsl(var(--tier-1-muted))",
          2: "hsl(var(--tier-2))",
          "2-muted": "hsl(var(--tier-2-muted))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
