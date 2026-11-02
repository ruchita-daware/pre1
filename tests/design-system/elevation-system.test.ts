import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('PreOne Fluent Metro Elevation System Architecture', () => {
  const globalsCss = fs.readFileSync(path.resolve(process.cwd(), 'src/app/globals.css'), 'utf8');
  const tailwindConfig = fs.readFileSync(path.resolve(process.cwd(), 'tailwind.config.ts'), 'utf8');

  describe('1. Canonical Elevation Token Architecture', () => {
    it('defines the 5 canonical elevation levels in light mode', () => {
      expect(globalsCss).toContain('--elevation-0: none;');
      expect(globalsCss).toContain('--elevation-1: var(--shadow-contact), var(--shadow-ambient);');
      expect(globalsCss).toContain('--elevation-2: 0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 14px 28px -4px rgba(15, 23, 42, 0.08);');
      expect(globalsCss).toContain('--elevation-3: 0 12px 24px -4px rgba(15, 23, 42, 0.08), 0 28px 56px -8px rgba(15, 23, 42, 0.14);');
      expect(globalsCss).toContain('--elevation-4: 0 20px 32px -4px rgba(15, 23, 42, 0.12), 0 36px 72px -12px rgba(15, 23, 42, 0.20);');
    });

    it('defines dual-layer contact and ambient shadows in light mode', () => {
      expect(globalsCss).toContain('--shadow-contact: 0 1px 3px 0 rgba(15, 23, 42, 0.04);');
      expect(globalsCss).toContain('--shadow-ambient: 0 12px 28px -6px rgba(15, 23, 42, 0.06);');
      expect(globalsCss).toContain('--shadow-floating:');
      expect(globalsCss).toContain('--shadow-dialog:');
    });

    it('defines dual-layer contact and ambient shadows in dark mode', () => {
      expect(globalsCss).toContain('--shadow-contact: 0 1px 3px rgba(0, 0, 0, 0.20);');
      expect(globalsCss).toContain('--shadow-ambient: 0 8px 30px rgba(0, 0, 0, 0.28);');
    });

    it('defines the 5 canonical elevation levels in dark mode', () => {
      expect(globalsCss).toContain('--elevation-2: 0 4px 8px -1px rgba(0, 0, 0, 0.30), 0 14px 30px -4px rgba(0, 0, 0, 0.28);');
      expect(globalsCss).toContain('--elevation-3: 0 12px 28px -4px rgba(0, 0, 0, 0.45), 0 32px 64px -8px rgba(0, 0, 0, 0.50);');
      expect(globalsCss).toContain('--elevation-4: 0 20px 40px -4px rgba(0, 0, 0, 0.55), 0 44px 80px -12px rgba(0, 0, 0, 0.65);');
    });
  });

  describe('2. Semantic Shadow Aliases', () => {
    it('maps all semantic shadow aliases to canonical elevation levels', () => {
      expect(globalsCss).toContain('--shadow-none:var(--elevation-0);');
      expect(globalsCss).toContain('--shadow-soft:0 1px 2px rgba(21,37,74,.04);');
      expect(globalsCss).toContain('--shadow-card:var(--elevation-1);');
      expect(globalsCss).toContain('--shadow-elevated:var(--elevation-2);');
      expect(globalsCss).toContain('--shadow-modal:var(--elevation-3);');
      expect(globalsCss).toContain('--shadow-universe:var(--shadow-modal);');
    });
  });

  describe('3. Specular Highlight Architecture', () => {
    it('defines top specular highlights in light mode', () => {
      expect(globalsCss).toContain('--highlight-top: rgba(255, 255, 255, 0.85);');
      expect(globalsCss).toContain('--surface-highlight: inset 0 1px 0 0 var(--highlight-top);');
      expect(globalsCss).toContain('--surface-highlight-dialog: inset 0 1px 0 0 rgba(255, 255, 255, 0.95);');
    });

    it('defines subtle specular bevel in dark mode without plastic glare', () => {
      expect(globalsCss).toContain('inset 0 1px 0 rgba(255, 255, 255, 0.035)');
    });
  });

  describe('4. Centralized Z-Index Hierarchy', () => {
    it('defines the strict stacking context scale', () => {
      expect(globalsCss).toContain('--z-sticky:100;');
      expect(globalsCss).toContain('--z-header:150;');
      expect(globalsCss).toContain('--z-dropdown:300;');
      expect(globalsCss).toContain('--z-drawer:400;');
      expect(globalsCss).toContain('--z-overlay:500;');
      expect(globalsCss).toContain('--z-modal:600;');
      expect(globalsCss).toContain('--z-toast:700;');
    });

    it('ensures monotonic stacking order (sticky < header < dropdown < drawer < overlay < modal < toast)', () => {
      const sticky = 100;
      const header = 150;
      const dropdown = 300;
      const drawer = 400;
      const overlay = 500;
      const modal = 600;
      const toast = 700;

      expect(sticky).toBeLessThan(header);
      expect(header).toBeLessThan(dropdown);
      expect(dropdown).toBeLessThan(drawer);
      expect(drawer).toBeLessThan(overlay);
      expect(overlay).toBeLessThan(modal);
      expect(modal).toBeLessThan(toast);
    });

    it('binds workspace-header-wrapper to --z-header', () => {
      expect(globalsCss).toContain('z-index: var(--z-header, 150);');
    });

    it('binds datepicker calendar popup to --z-dropdown', () => {
      expect(globalsCss).toContain('z-index:var(--z-dropdown, 300);');
    });
  });

  describe('5. High-Contrast Elevation Flattening (WCAG AAA Hardened)', () => {
    it('flattens all diffuse shadows in high-contrast-light', () => {
      const hcLightMatch = globalsCss.match(/\[data-theme="high-contrast-light"\]\s*\{([\s\S]*?)\}/);
      expect(hcLightMatch).toBeTruthy();
      const hcLightContent = hcLightMatch![1];
      expect(hcLightContent).toContain('--elevation-1: none;');
      expect(hcLightContent).toContain('--elevation-2: none;');
      expect(hcLightContent).toContain('--elevation-3: none;');
      expect(hcLightContent).toContain('--shadow-card: none;');
      expect(hcLightContent).toContain('--shadow-floating: none;');
      expect(hcLightContent).toContain('--shadow-dialog: none;');
    });

    it('flattens all diffuse shadows in high-contrast-dark', () => {
      const hcDarkMatch = globalsCss.match(/\[data-theme="high-contrast-dark"\]\s*\{([\s\S]*?)\}/);
      expect(hcDarkMatch).toBeTruthy();
      const hcDarkContent = hcDarkMatch![1];
      expect(hcDarkContent).toContain('--elevation-1: none;');
      expect(hcDarkContent).toContain('--elevation-2: none;');
      expect(hcDarkContent).toContain('--elevation-3: none;');
      expect(hcDarkContent).toContain('--shadow-card: none;');
      expect(hcDarkContent).toContain('--shadow-floating: none;');
      expect(hcDarkContent).toContain('--shadow-dialog: none;');
    });

    it('enforces 2px solid boundary borders in high-contrast mode', () => {
      expect(globalsCss).toContain('border: 2px solid #000000;');
      expect(globalsCss).toContain('border: 2px solid #FFFFFF;');
    });
  });

  describe('6. Floating Surfaces & Glass Morphism', () => {
    it('standardizes dock floating shadow and frosted blur', () => {
      expect(globalsCss).toContain('.dock-shelf');
      expect(globalsCss).toContain('box-shadow: var(--workspace-floating-shadow);');
      expect(globalsCss).toContain('backdrop-filter: blur(var(--surface-header-blur, 12px));');
    });

    it('provides glass morphism fallbacks for unsupported browsers and reduced transparency', () => {
      expect(globalsCss).toContain('@supports not (backdrop-filter: blur(16px))');
      expect(globalsCss).toContain('@media (prefers-reduced-transparency: reduce)');
      expect(globalsCss).toContain('@media (prefers-reduced-motion: reduce)');
    });
  });

  describe('7. Tailwind Configuration Alignment', () => {
    it('maps all canonical shadows into Tailwind theme extension', () => {
      expect(tailwindConfig).toContain("soft: 'var(--shadow-soft)'");
      expect(tailwindConfig).toContain("card: 'var(--shadow-card)'");
      expect(tailwindConfig).toContain("elevated: 'var(--shadow-elevated)'");
      expect(tailwindConfig).toContain("modal: 'var(--shadow-modal)'");
      expect(tailwindConfig).toContain("floating: 'var(--shadow-floating)'");
      expect(tailwindConfig).toContain("dialog: 'var(--shadow-dialog)'");
      expect(tailwindConfig).toContain("'elevation-1': 'var(--elevation-1)'");
      expect(tailwindConfig).toContain("'elevation-2': 'var(--elevation-2)'");
      expect(tailwindConfig).toContain("'elevation-3': 'var(--elevation-3)'");
      expect(tailwindConfig).toContain("'elevation-4': 'var(--elevation-4)'");
    });

    it('maps centralized z-indexes into Tailwind theme extension', () => {
      expect(tailwindConfig).toContain("sticky: 'var(--z-sticky, 100)'");
      expect(tailwindConfig).toContain("header: 'var(--z-header, 150)'");
      expect(tailwindConfig).toContain("dropdown: 'var(--z-dropdown, 300)'");
      expect(tailwindConfig).toContain("drawer: 'var(--z-drawer, 400)'");
      expect(tailwindConfig).toContain("overlay: 'var(--z-overlay, 500)'");
      expect(tailwindConfig).toContain("modal: 'var(--z-modal, 600)'");
      expect(tailwindConfig).toContain("toast: 'var(--z-toast, 700)'");
    });
  });
});
