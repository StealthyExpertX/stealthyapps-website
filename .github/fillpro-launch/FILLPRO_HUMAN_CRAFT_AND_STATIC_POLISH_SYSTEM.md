# FillAhead Human Craft and Static Polish System

Updated: 2026-06-14

This is the working quality bar for FillAhead website copy, extension UI text, and static HTML/CSS/JS polish. Use it when writing a page, editing popup text, adding a state message, or reviewing a release.

## 1. FillAhead Voice

FillAhead should sound calm, practical, and specific. It is a privacy tool for repeated forms, so the voice should feel careful without sounding scared.

Write like this:

- Short sentence first when the idea matters.
- Use concrete nouns: profile, form, field, resume, upload, browser, page.
- Say what FillAhead does and what it does not do.
- Prefer small confidence over loud excitement.
- Let support copy sound like a person who will actually read the report.

Avoid this:

- "Unlock the power of"
- "In today's rapidly evolving landscape"
- "Seamless and robust"
- "Delve into"
- "Transform your workflow"
- "Crucial and paramount"
- "Leverage cutting-edge technology"
- "At the click of a button" unless the UI literally has one button
- Long strings of equal-length sentences
- Privacy copy that hides the tradeoff behind vague reassurance

## 2. Before and After

| Generic copy | FillAhead copy |
| --- | --- |
| Unlock the power of effortless form completion. | Save the fields you keep retyping. Fill them when a form gets long. |
| FillAhead seamlessly handles all your form needs. | FillAhead handles repeated profile fields. Passwords, cards, and one-time codes stay with tools built for them. |
| Your data is safe and secure. | Saved profiles, rules, and uploads stay inside the extension unless you export them, email support, or start Pro billing. |
| No matching fields were found. | Nothing looked safe to fill on this page. |
| An unexpected error occurred. | FillAhead hit a snag before it could fill this page. A short report helps us fix the site. |
| Upgrade to unlock unlimited productivity. | Need more room? Pro adds more profiles, duplication, import, and export. |
| The extension provides robust support for modern web forms. | It works on common modern form pieces: dropdowns, radios, checkboxes, textareas, same-origin frames, Shadow DOM, and upload fields. |

## 3. Sentence Rhythm

Use a varied rhythm:

- 1 short sentence for control or privacy: "Review before submit."
- 1 medium sentence for the job: "Pick a profile, fill the page, then check the result."
- 1 longer sentence only when a boundary needs context: "The floating button asks for access to the current site only, and you can turn it off from FillAhead settings."

Do not stack three medium marketing sentences in a row. It reads generated.

## 4. Privacy Copy

Privacy copy should name the storage boundary and the user action that crosses it.

Use:

- "Saved profiles stay inside the extension."
- "Exports only happen when you choose them."
- "Support emails include diagnostics only when you opt in."
- "Billing is handled by ExtensionPay and Stripe."
- "Sign-ins, cards, CVCs, tax IDs, and one-time codes stay with your browser, wallet, or password manager."

Avoid:

- "We never access your data" if the extension must read a chosen page to fill it.
- "Bank-level security" unless there is a specific audited basis.
- "Anonymous analytics" unless analytics exists and is documented.
- Shorthand privacy slogans. Say where the data stays.

## 5. UI State Copy

### Empty States

Good empty states answer two things: what is missing and what the user can do next.

Examples:

- "No profiles saved yet. Add the details you reuse most. You can fill the rest later."
- "No smart rules yet. Run FillAhead on a tricky form, then save the label once."
- "No disabled sites. FillAhead is available on pages you choose."

### Error States

Error copy should not blame the user or pretend everything is fine.

Examples:

- "That page did not fill cleanly. A quick report is open."
- "Permission was not granted, so the floating button stays off."
- "This profile is too large to save. Remove one upload and try again."

### Loading States

Use precise verbs:

- "Loading profiles..."
- "Collecting diagnostics..."
- "Opening email draft..."
- "Checking Pro status..."

Avoid fake friendliness like "Just a sec!" in privacy or billing flows.

### Success States

Success copy should be small:

- "Profile saved."
- "Filled 4 fields."
- "Site rule added."
- "In-page fill button turned off."

## 6. Static Polish System

The website and extension should feel premium through restraint: stable layout, precise spacing, fast feedback, and no heavy motion.

### Buttons

Use one shine sweep on intentional primary actions. Timing should sit around 800-1100ms for hover-triggered sweeps and never run constantly except on a single hero CTA with a long pause.

```css
.premium-button {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  transition:
    border-color 160ms ease,
    box-shadow 180ms ease,
    transform 180ms ease,
    background-color 160ms ease;
}

.premium-button::after {
  content: "";
  position: absolute;
  inset: -90% auto -90% -46%;
  width: 44%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.42), transparent);
  transform: translateX(-120%) rotate(18deg);
  transition: transform 980ms cubic-bezier(.22, 1, .36, 1);
  pointer-events: none;
}

.premium-button:hover::after,
.premium-button:focus-visible::after {
  transform: translateX(420%) rotate(18deg);
}

.premium-button:active {
  transform: translateY(0);
}
```

### Cards and Panels

Cards should lift by 1-2px at most. Do not make page sections into floating cards. Use cards for repeated items, modals, and framed tools.

```css
.quiet-panel {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--paper);
  transition:
    border-color 160ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.quiet-panel:hover,
.quiet-panel:focus-within {
  border-color: var(--line-strong);
  box-shadow: 0 16px 34px rgba(18, 32, 42, .08);
  transform: translateY(-1px);
}
```

### Inputs and Toggles

Focus should feel designed, not default. Keep the outline visible.

```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

input:focus,
textarea:focus,
select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 16%, transparent);
}
```

### CSS-Only Interactive Background

Use the existing FillAhead pattern: a low-contrast grid and one pointer-reactive radial highlight. It is cheaper than canvas, works on static hosting, and is easy to disable.

Rules:

- Update CSS variables with `requestAnimationFrame`.
- Never attach per-element mouse handlers for the background.
- Disable movement under `prefers-reduced-motion: reduce`.
- Keep opacity below 0.65 in light mode and below 0.45 for dark decorative layers.

### Scroll Reveals

Use `IntersectionObserver`, not a scroll library. Reveal only section-level content and repeated cards. Do not animate every line of copy.

```js
var observer = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
```

```css
@media (prefers-reduced-motion: no-preference) {
  .reveal-item {
    opacity: 0;
    transform: translateY(14px);
    transition: opacity 420ms ease, transform 520ms cubic-bezier(.22, 1, .36, 1);
  }

  .reveal-item.is-visible {
    opacity: 1;
    transform: none;
  }
}
```

### Dark Mode

Dark mode should be readable before it is dramatic.

- Do not crush contrast with smoky text.
- Keep surfaces separated by borders and subtle shadows.
- Use brand color for affordances, not whole backgrounds.
- Keep warning states warm but legible.

### Performance Rules

- Animate only `opacity` and `transform`.
- Use `will-change` only while an element is about to animate.
- Keep transitions under 220ms for direct UI controls.
- Keep reveal transitions under 560ms.
- Avoid infinite loops except a single long-delay CTA shine.
- Prefer CSS gradients over canvas unless the visual genuinely needs particles.
- Every animation must respect reduced motion.

## 7. Effects to Avoid

- Gradient orb backgrounds, bokeh blobs, or floating decoration.
- Parallax tied directly to scroll position.
- Constant shimmer on buttons or cards.
- Cursor trails.
- Auto-playing confetti.
- Blur-heavy glass layers over important text.
- Over-rounded pills for every label.
- Tiny tap targets dressed up with shadows.
- Hover motion that changes layout.

## 8. Combined Product Rules

FillAhead should feel distinct because the product has a clear boundary:

- It saves repeated profile fields.
- It fills only when the user chooses.
- It leaves review and submit with the user.
- It refuses sensitive fields.
- It improves from real site reports.

Every page or popup view should reinforce one of those ideas without repeating all of them.

## 9. Review Checklist

Before shipping a FillAhead copy or UI change, check:

- Does the copy say one specific thing instead of three generic things?
- Could a privacy claim be proven from the current implementation?
- Is the next action obvious without sounding pushy?
- Are empty, error, loading, and success states written in the same voice?
- Does the UI still work without motion?
- Are buttons at least 34px for icon controls and 44px for primary actions?
- Does any hover or reveal cause layout shift?
- Are password, card, OTP, tax ID, and protected identity fields still treated as out of scope?
- Did we avoid "unlock", "seamless", "robust", and "rapidly evolving"?
- Would this feel normal if a small, careful team wrote it at the end of a real release day?
