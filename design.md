# Design system

Use generous spacing, softly rounded surfaces, and a muted background. Keep most UI neutral so thumbnails supply the color. Reserve blue for primary actions, text links, and keyboard focus. Use the semantic tokens in [`app/globals.css`](app/globals.css) for both light and dark themes.

## Primitives

Import only the parts you use from their [ui-sdk component entry points](https://ui-sdk.dev/docs/react/components), such as `@ui-sdk/react/button` or `@ui-sdk/react/rating`. Let ui-sdk handle control behavior and style its documented `data-slot` and state attributes in `app/globals.css`.

- Use `Button` with `data-variant="solid"` for the primary action and without a variant for a secondary action. When a button-styled action navigates, render it as an anchor with `render={<a href="…" />}` to preserve link semantics.
- Use `text-link` for inline navigation and `card-link` when the entire card opens a destination. For internal navigation with a page transition, use `TransitionLink`.

## Layout and hierarchy

- Use `page-shell` and `page-header` for the shared page width and spacing. Use `page-title`, `section-title`, and `metadata` for the text hierarchy.
- Use `surface` for cards and panels, `badge` for themes, and `badge` with `data-variant="highlight"` for Bonus Track. Use Tailwind utilities for layout within each view.
- Check changes on mobile and desktop, in light and dark themes, and with keyboard navigation. Keep keyboard focus visible and honor reduced motion.
