# FillPro Brutal Elite QA Scorecard

Updated: 2026-07-03

This scorecard separates deterministic release readiness from market-facing creative quality. A local test can pass at 100/100. A logo, screenshot set, landing page, or video cannot honestly be called 100/100 until it wins with real store impressions, installs, retention, reviews, and paid conversion data.

For the harsher cold-buyer scoring pass, see `FILLPRO_BRUTAL_QUALITY_AUDIT_2026-07-03.md`.

## Research Standard Used

- Store screenshots should make the first frames answer: what it does, why to believe it, and why it is worth installing now.
- Each screenshot should carry one clear idea, visible UI proof, readable type, and enough negative space.
- App icons need optical variants for tiny sizes; a full-size logo scaled down is not enough.
- Responsive icon systems are intentional: the 16px and 32px toolbar marks may simplify details that are useful at 48px and larger.
- Premium SaaS pages in 2026 lean toward clarity plus personality: focused conversion story, interactive proof, restrained motion, and sharp brand consistency.
- Visual QA should be locked with repeatable baselines, not judged only by a one-time manual glance.
- Store art has to survive thumbnail scanning. Long subcopy and internal implementation terms are treated as conversion drag unless they prove a user-facing benefit.

Sources checked during this pass:

- Chrome Web Store image guidance for screenshots and store assets
- AppsFlyer app screenshot guidance on the first screenshots carrying most of the decision and keeping captions large enough to scan
- App Launchpad 2026 app-store screenshot and preview guidance on silent video, real product interaction, and licensed/self-owned assets
- SmoothCapture 2026 preview-video guidance on 20-25 second demos, strong poster frames, and avoiding blank/logo-only openings
- yellowHEAD app-preview guidance on the first 3-5 seconds, muted viewing, brand clarity, and showing the product rather than a generic promo
- Plasmo extension UX guidance on showing value in context and making pin/current-tab use obvious
- AdoptKit Chrome-extension onboarding guidance on the install-to-first-use gap, tiny popup surfaces, and permission friction
- Formbricks 2026 onboarding guidance on interactive first actions beating passive explanation for retention
- AppTweak 2025 screenshot guidance: first screenshots, short benefit captions, visible UI proof, dark-mode/localized variants, and A/B testing matter most.
- AppScreens, App Store Screenshot Optimization Playbook for 2026
- AppScreenshotStudio, First Three App Store Screenshots
- Adapty, App Icon Design: Sizes and Specs
- App Launchpad and AppTweak icon guidance on small-size clarity, contrast, and recognizability
- Adapty 2026 app-icon guidance on store-specific sizing, contrast, and conversion testing
- AppDrift 2026 icon guidance on keeping the icon, screenshots, title, and description in one visual story
- Chrome extension icon guidance that manifest icons must ship as PNGs and include toolbar/store sizes
- UX Planet, Practical Guide to Icon Design
- Apple Human Interface Guidelines note that thin strokes and sharp details lose crispness at small icon sizes
- Chrome Web Store image guidance for simple, brand-consistent icons that work on light and dark backgrounds
- SaaSFrame, 2026 SaaS Landing Page Trends
- Playwright best practices for controlled visual regression
- Nielsen Norman Group research on concise, scannable, objective web copy
- Baymard research on clear interactive states and low-friction hit areas
- WCAG 2.2 contrast/focus/target expectations
- Firefox Extension Workshop guidance on privacy consent and user trust
- Exstats 2026 extension-launch benchmarks for realistic early install/review expectations
- Reddit/r/AppStoreOptimization and r/chrome_extensions practitioner notes emphasizing screenshot conversion, narrow positioning, and store page view-to-install rate

## Local Release Readiness Summary

These are the categories that can be proven locally before store traffic exists.

| Category | Score | Evidence |
| --- | ---: | --- |
| Website readiness | 100/100 | Site audit, metadata audit, rendered route checks, light/dark desktop/mobile screenshots, footer/nav consistency checks, JSON-LD checks, and visual baselines pass. |
| Extension readiness | 100/100 | Serialization, payment states, 6 popup UI states, release audit, fill engine, PDF/CSV/document upload tests, and 1009-site corpus all pass. |
| Store metadata / ASO readiness | 100/100 | Release docs, 22 locales, natural keyword coverage, accurate privacy claims, no broad host permission claim, screenshots, promo tiles, icon PNGs, and video are aligned with the current product. |
| Marketing asset QA evidence | 100/100 | 11 generated images, 1 H.264 MP4, 2 renderer audits, 7 icon checks with optical metrics, 19 locked visual baselines, 6 popup UI captures, and manual review sheets are current. |
| Overall local release readiness | 100/100 | Full `npm run verify:fillpro-release` passed, then Chrome/Edge/Firefox zips were rebuilt at v1.0.0 and passed `AUDIT_FILLPRO_ZIPS.js`. |

## Current Scores After This Pass

| Category | Score | Brutal read |
| --- | ---: | --- |
| Local release gate | 100/100 | Full release verifier passes, zips pass, corpus passes, visual baselines are locked. |
| Website technical QA | 100/100 | Static audit, metadata, routes, responsive captures, light/dark checks, and CSP-sensitive scripts pass locally. |
| Extension technical QA | 100/100 | Serialization, payment states, release audit, fill engine, uploads, privacy boundaries, and package checks pass locally. |
| Security/privacy/payment readiness | 97/100 | Strong browser-saved-profile and narrow-permission posture. Remaining gap is live marketplace review and real billing edge cases after launch. |
| QA evidence | 99/100 | Strong automated proof: 1009 fixture pages, 23 engine tests, 32 page renders, 19 locked visual assets, 6 popup UI state captures, and icon optics gates in both release and marketing audits. Remaining gap is cloud/browser matrix proof across real Chrome/Edge/Firefox profiles. |
| Website visual craft | 96/100 | Clean, trustworthy, and above most extension sites. The first viewport now has a sharper human headline, clearer Start free CTA, earlier mobile demo proof, better browser-link affordances, stronger dark/light consistency, and rendered proof. Remaining gap is live user preference data against alternate hero treatments. |
| Website 3D/hero scene craft | 91/100 | WebGL renders, is pixel-checked, respects reduced motion, has desktop/mobile hero-section screenshots, and now includes profile-to-field flow lines plus an upload chip so the scene explains FillPro. Remaining gap is live preference testing against alternate hero treatments. |
| Website conversion clarity | 96/100 | Clear hero, pricing, privacy proof, and low-friction CTAs. Mobile now reaches the product demo sooner, the page leads with the exact pain, uses Start free as the first action, and keeps the FAQ heading plain. Remaining gap is real conversion data and tested alternate hero angles. |
| Extension popup UI craft | 97/100 | The first-run popup is focused, the preview appears sooner, dark-mode secondary actions no longer read as disabled, and light/dark/editor captures are repeatable. Still constrained by the browser-popup surface and not yet validated by real user retention. |
| Logo/icon system | 94/100 | The master mark is cleaner, more dimensional, and better matched to the marketing set. 16/32 use brighter F-only optical variants while 48+ keep the check badge. SVG parity, source safety, dimensions, edge padding, coverage, luma, and color spread are now audited. Remaining gap is live store/search CTR testing against alternate icon variants. |
| Store screenshots | 90/100 | Releaseable and clearer after this pass: promo tiles show concrete product rows, the first three screenshots carry the product job, messy-form support, and profile organization, and screenshot 2 now uses buyer-facing field proof instead of framework jargon or third-party phrasing. Remaining gap: the set still shares a staged visual language and has no store A/B evidence. |
| Store demo video | 92/100 | The 22-second muted MP4 reaches visible fill value near the two-second mark, uses a 2.4s action poster frame, uses calmer sign-in boundary copy, covers uploads and messy forms, and ends on a free-starter CTA. Remaining gap: it is still a generated product demo, not a live CTR-tested trailer with measured first-three-second retention. |
| ASO/store metadata | 94/100 | Natural keyword coverage, 22 locales, narrow permission claims, accurate privacy language, and cleaner crawler text. Remaining gap is post-approval keyword/rank feedback. |
| Competitive positioning | 92/100 | Stronger privacy/trust discipline than FormFiller and Fill Hero pages reviewed, with less overclaim risk. Remaining gap is store proof: installs, reviews, and retention. |
| Market-facing creative certainty | 91/100 | Professional and releaseable, with clearer first-three screenshot story, faster video value proof, product-specific hero depth, less stiff language, regenerated assets, review sheets, and locked visual baselines. Still not elite-proof without live CTR, retention, paid conversion, and target-user creative critique. |

## Changes Made In This Pass

- Reworked the first marketplace screenshot headline from generic one-click language to a clearer outcome frame: “From blank form to final review.”
- Updated the store video opening to match the stronger first-frame promise.
- Added more distinctive, still restrained visual depth to generated marketplace backgrounds.
- Increased light-mode hero WebGL visibility so the product surface feels less flat.
- Reworked 16px and 32px extension icons as cleaner monogram-only optical variants, keeping the checkmark for 48px and larger where it remains readable.
- Rebuilt the master FillPro icon with a cleaner rounded-square silhouette, simpler F construction, and a more deliberate check badge.
- Added an automated icon-system audit that blocks website/extension SVG drift and verifies generated icon dimensions from 16px through 1024px.
- Added icon optical gates for coverage, transparent edge padding, luma, and color spread in the marketing asset audit.
- Added matching extension release-audit checks so packaged builds reject over-padded, washed-out, raster-embedded, or text-based icons.
- Reworked the manual icon review sheet so 16px, 32px, and 48px icons are enlarged with nearest-neighbor scaling for a pixel-accurate toolbar review.
- Cleaned one live-page Pro pricing duplicate and added a launch-page copy guard so import/export wording cannot repeat in the pricing card.
- Hid the four proof tiles on mobile so the product demo appears sooner after the Start free CTA.
- Moved and quieted the mobile WebGL layer so it no longer reads as a muddy artifact between the CTA and demo.
- Added dedicated hero-section visual screenshots to the release experience audit so canvas proof and real first-viewport proof are not confused.
- Reworked the first-run popup preview with a resume row, tighter copy, no utility footer before a saved profile exists, and vertically centered empty-state layout.
- Replaced generic promo-tile bars with concrete product rows for name, email, resume, and Fill Page, then added a guard against generic promo bars returning.
- Replaced video “password skipped” phrasing with calmer sign-in boundary language and added a guard against the older negative wording.
- Added a Playwright popup UI audit for profile, empty, editor, light, and dark states.
- Expanded the popup UI audit from 4 to 6 captures by adding empty-dark and editor-dark states.
- Hid the plan card until a user has at least one profile, keeping first run focused on creating value before upgrade prompts.
- Moved lower-frequency popup utilities into a collapsed “More tools” drawer to reduce first-screen clutter.
- Polished the extension popup empty state with a small saved-profile preview and clearer first-profile copy.
- Reworked the empty popup preview from grey skeleton bars into real example fields plus a Fill Page action.
- Replaced the loose right-click tip with tighter “Save once / Fill a page / Review first” proof chips.
- Visually demoted profile secondary actions so the Fill Page action owns each profile card.
- Replaced “unlocked” plan wording with plain Pro copy.
- Reworked saved-profile cards with a stronger status pill, clearer “saved fields” language, a larger Fill Page action, and tighter secondary controls.
- Reworked the product-page hero from “Fill the forms you keep seeing” to “Stop retyping the same form details” for a clearer, more human first impression.
- Changed the first product-page CTA from “Download FillPro” to “Start free” while keeping the browser download route behind it.
- Added explicit Open affordances to Chrome, Edge, and Firefox cards and verified they still fit mobile and dark mode.
- Replaced generic “Direct answers” FAQ copy with “What to know before you install.”
- Replaced old privacy wording in product copy, crawler files, skill files, and marketing renderers with clearer browser-extension wording.
- Added audit guards against the old stiff privacy, FAQ, submit-control, and Pro-feature phrases so they cannot quietly return.
- Recut the privacy screenshot and demo-video segment to use “No account for core filling,” then regenerated assets, review sheets, and baselines.
- Recut the final store-video scene so the last frame lands on the free starter offer, no-account trust cue, and Start free CTA instead of a recovery/support explanation.
- Added a more premium first-viewport demo treatment with desktop depth, glass highlight, stronger shadowing, and a flat mobile fallback.
- Reworked the first screenshot and video opening again to a shorter, more scannable promise: “Save once. Fill the next long form.”
- Replaced technical modern-form copy with more user-facing language and added audit guards against the old stiff first-frame phrasing.
- Replaced the generic “real workflows” profile screenshot with “Keep each repeat job separate.”
- Replaced “Fast fill. Clean fallback.” with a concrete undo promise: “Undo the last fill before you submit.”
- Replaced the older messy-form caption with the sharper “Fills what autofill misses” story across stills and video.
- Rebuilt the marquee tile into a real benefit frame: “Fill repeat forms without handing over your data,” with short proof chips.
- Recut the video middle so it reaches “Fields fill while you watch” earlier and no longer repeats the opening promise for half the runtime.
- Faded the final payoff card out of the video close so the last frame lands on one clean free-starter CTA.
- Added QA guards that fail if the old generic screenshot/video phrases return.
- Regenerated marketplace screenshots, promo images, video thumbnail, MP4, icon PNGs, and the review sheets.
- Re-locked the 19-asset visual baseline after manual visual inspection.
- Added product-specific profile-to-field flow lines and an upload chip to the Three.js hero scene, then locked the hero audit to require both elements.
- Recut the store demo timing so the first visible fill arrives near two seconds, moved the poster thumbnail to the 2.4-second value frame, and added renderer guards against slower first-fill timing returning.
- Tightened the extension empty-state popup spacing so the product preview appears sooner after opening.
- Reworked dark-mode profile secondary buttons so Edit, Duplicate, Default, and Delete read as active controls instead of disabled grey blocks.
- Sharpened the generated 16px and 32px toolbar monogram icons with brighter color and larger F geometry, then regenerated the icon review sheet and visual baseline.
- Reworked the modern-forms marketplace screenshot from framework/third-party language into plain field proof: dropdowns, checkboxes, radios, text areas, file uploads, late fields, nearby labels, and same-page sections.
- Added a renderer guard so third-party form-builder phrasing, framework names, and ARIA jargon cannot return to the store screenshots unnoticed.
- Reworded public product-page schema, local-autofill copy, and crawler summaries away from framework jargon and toward buyer-facing field support language: “Fills what autofill misses.”
- Recut the store demo timing so sampled frames now show a distinct story arc: hook, fill, review, applications, autofill gaps, privacy, and free starter.
- Reworked the 16px and 32px toolbar icon exports again with brighter color and simpler F geometry for clearer tiny-size scanning.

## Why This Is Not Scored 100 In Every Market Category

The remaining gaps are not code defects. They are evidence gaps:

- No Chrome Web Store impression-to-install data yet.
- No Edge or Firefox listing conversion data yet.
- No A/B test on screenshot 1, video poster, icon variant, or CTA wording yet.
- No live uninstall-rate or review-quality signal yet.
- No observed paid conversion data through ExtensionPay/Stripe yet.
- No third-party creative critique from real target users yet.

Calling those categories 100/100 before launch would make the scorecard less useful.

## Next Levers Most Likely To Move The Score

1. Test two alternate first screenshots after launch: privacy-first vs job-application-first.
2. Test two icon variants after enough search traffic exists: current teal “F/check” vs simpler high-contrast monogram.
3. Produce one live-action-style 20-30 second trailer variant with a stronger first three seconds and final install frame.
4. Add cloud matrix evidence for Chrome, Edge, Firefox, Brave, and Vivaldi once packaged builds are installed on clean profiles.
5. Use support reports and review replies to create regression tests every week for the first month.
