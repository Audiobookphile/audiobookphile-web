---
name: liquid-glass-ui
description: Design principles, tokens, and component patterns for the Audiobookphile Liquid Glass (LG) aesthetic on the web.
---

# Liquid Glass UI Standards (Audiobookphile Web)

Audiobookphile uses a custom **Liquid Glass (LG)** visual design language built with Tailwind CSS v4.

## Core Visual Attributes

1. **Multi-layer Glassmorphism**:
   - Backgrounds: `bg-white/5` (light) / `bg-zinc-900/40` (dark).
   - Backdrop Blurs: `backdrop-blur-md` (subtle cards) to `backdrop-blur-2xl` (floating overlays/modals).
   - Borders: `border border-white/10 dark:border-white/5` with hover states `hover:border-white/20`.
   - Shadows: Soft diffuse shadows with subtle refractive highlights.

2. **Micro-animations & Fluid Motion**:
   - Use CSS spring physics and hardware-accelerated transforms (`transform-gpu transition-all duration-300 ease-out`).
   - Cards scale subtly on hover: `hover:scale-[1.02] active:scale-[0.98]`.
   - Playback scrubber and waveform visualizers react fluidly to user scrubs.

3. **Dominant Color Extraction**:
   - Cover art dynamically drives page background tinting and player ambiance via extracted RGB palettes.
   - Tint layer: `mix-blend-overlay` or subtle radial gradient behind active audiobook views.

## Example Card Component

```tsx
<div className="group relative overflow-hidden rounded-2xl bg-white/5 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/10 p-5 shadow-glass transition-all duration-300 hover:border-white/20 hover:shadow-glass-hover">
  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
  {/* Content */}
</div>
```

