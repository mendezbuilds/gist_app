# Design System: Gist App
**Project ID:** com.gist.app

## 1. Visual Theme & Atmosphere
The creative north star for the Gist App design system is **"Modern Yoruba Adire"** — blending the rich, organic, resist-dye textile heritage of southwestern Nigeria with a state-of-the-art, premium chat experience.

The visual tone is authentic, warm, and highly professional. We establish depth and texture through subtle, repeating geometric and symbolic Adire grid motifs (Cassava Leaf, Cowry, Talking Drum, Suns) rather than relying on flat digital panels. The interface is spacious, utilizing generous padding and clear hierarchy to create an editorial feel that respects physical craftsmanship.

---

## 2. Color Palette & Roles
The color palette is strictly restricted to the traditional natural dyes of Adire textiles (Indigo, Coral, Ivory, and Deep Charcoal).

### Primary Colors
*   **Adire Indigo (#1B2A6B):** The primary brand accent and CTA color. Used for all primary actions, buttons, active inputs, and focused states in light mode.
*   **Adire Light Indigo (#3548A3):** The primary brand accent and CTA color in dark mode (provides optimal contrast against deep dark backgrounds).
*   **Traditional Ivory (#F7F1E3):** The primary background color in light mode, giving the app a warm, organic, tactile feel.
*   **Near-Black Indigo (#0E1224):** The primary background color in dark mode, simulating the deepest, unoxidized indigo dye vat.

### Accents & Neutrals
*   **Resist Coral (#E8552F):** A constant highlight accent color. Used selectively for decorative logo/branding dots, active notifications, and typing indicators.
*   **Charcoal Text (#1A1A1A):** Primary body and heading text color in light mode.
*   **Warm White Text (#F0EEE6):** Primary body and heading text color in dark mode.
*   **Muted Indigo Grey (#6B6B6B):** Secondary text and outline borders in light mode.
*   **Deep Indigo Surface (#1B1F38):** Card and container surface color in dark mode.

---

## 3. Typography Rules
A high-contrast typeface pairing establishes editorial authority:

*   **Display & Headings (Fraunces):** An elegant, display serif used exclusively for the wordmark logo and top-level screen headers. Always set with tight tracking (`letterSpacing: -1.5` or `-0.5`) to feel authoritative. Always add horizontal padding (`paddingRight: 8` or `10`) when rendering to prevent glyph clipping.
*   **UI & Body (Nunito):** A geometric, rounded sans-serif used for all functional UI elements, button labels, input fields, and chat bubbles.
*   **Android Font Padding:** Always configure `includeFontPadding: false` and `textAlignVertical: 'center'` on Text elements using custom fonts to avoid vertical cropping.

---

## 4. Component Stylings

### Buttons
*   **Pill-Shaped (Rounded LG):** Buttons utilize a comfortable `borderRadius` of 12px or greater.
*   **Primary Variant:** Colored in **Adire Indigo** (`#1B2A6B` / `#3548A3`). Text is pure white.
*   **Secondary Variant:** Outlined with 1.5px border of **Adire Indigo**.
*   **Animations:** Scale down slightly on press (`0.97`) using snappy spring animations. Trigger light haptic feedback.

### Text Inputs
*   **Default State:** Background uses `colors.surface` with a 1.5px border of `colors.border` (muted grey).
*   **Focused State:** The border animates to **Adire Indigo** focus ring using a smooth timing transition.
*   **Android Inputs:** Pad text horizontally to ensure placeholder text does not clip.

### Cards & Surfaces
*   **Material:** Semi-transparent glassmorphism sheets with a subtle backdrop filter blur.
*   **Border Radius:** 24px (`borderRadius['2xl']`) for a modern, soft organic appearance.
*   **Elevation:** Ambient soft shadows with high blur and very low opacity (4%).

---

## 5. Layout Principles
*   **4-Point Grid:** All margins, padding, and gaps align to 4px increments.
*   **Spacious Margins:** Content containers use at least 24px (`spacing[6]`) of horizontal padding.
*   **Asymmetry:** Leverage left-aligned display headings offset by centered primary action buttons to create a dynamic, premium layout.
