# FillPro v1.0.0 Release and Maintenance Guide

Date: 2026-06-14

## Daily Release Rule

Keep FillPro at `1.0.0` for the initial release. Do not bump the version unless there is a real user-facing fix or you explicitly choose to ship a new store update.

## Build and Test Everything

From `D:\root\projects\PluginMassCreation`:

```bat
cmd /c BUILD_FILLPRO_EXTENSION_RELEASE.bat
```

That runs the release audit, serialization tests, mocked payment-state tests, fill-engine Playwright tests, 109 local site-corpus fixtures, multiplatform build, and zip audit.

Website audit:

```bat
cd /d D:\root\projects\PluginMassCreation\fillpro-site
npm test
```

## Release Files

- Chrome: `D:\root\projects\PluginMassCreation\dist\fillpro-chrome.zip`
- Edge: `D:\root\projects\PluginMassCreation\dist\fillpro-edge.zip`
- Firefox: `D:\root\projects\PluginMassCreation\dist\fillpro-firefox.zip`
- Product URL: `https://stealthyapps.com/fillpro/`
- Support URL: `https://stealthyapps.com/support/`
- Privacy URL: `https://stealthyapps.com/fillpro/privacy/`

## Store Submission Order

1. Submit Chrome first.
2. Submit Edge the same day with the Edge zip.
3. Submit Firefox the same day with the Firefox zip.
4. Use the marketplace docs already in the repo for copy-paste store fields.
5. Add the final screenshots and demo clip you create.
6. After approval, replace website contact CTAs with live store install buttons.

## Screenshot and Clip Plan

Use five screenshots:

1. Fill repeated forms from a saved profile.
2. Match resumes, CSVs, and documents to upload fields.
3. Choose the right profile without leaving the page.
4. Add rules for unusual field labels.
5. Review, undo, then submit when ready.

Use one 20-35 second clip: start with a realistic long form, open FillPro, choose a profile, fill safe fields, show the upload match, show password/payment fields untouched, finish on review-before-submit.

## Review and Support Plan

Ask for honest reviews only after repeated successful fills. Do not reward, gate, filter, or pressure reviews. If a fill fails, send the user to support instead. Reply to every real review and support email during the first month.

## Compatibility Maintenance

When a user reports a bad fill:

1. Reproduce it without private values.
2. Add a local fixture when possible.
3. Fix the engine broadly if the issue is a pattern.
4. Fix narrowly only when the pattern is truly site-specific.
5. Rerun `cmd /c BUILD_FILLPRO_EXTENSION_RELEASE.bat`.
6. Ship a new version only for a real fix.

## Payment Maintenance

Billing uses ExtensionPay. Do not collect card details in the extension. Keep the mocked payment-state test passing for paid, trial, free, canceled billing, billing unavailable with cached Pro, and billing unavailable without cache.

## Website Maintenance

Keep the site static. Run `npm test` after copy, CSS, metadata, sitemap, JSON-LD, cache-token, or page changes. Keep dark mode, reduced motion, nav labels, footer spacing, canonical URLs, `llms.txt`, and `llms-full.txt` aligned with the visible page.

## Git Push

Website:

```bat
cd /d D:\root\projects\PluginMassCreation\fillpro-site
git status
git add .
git commit -m "Polish FillPro v1 launch site"
git push origin main
```

Extension:

```bat
cd /d D:\root\projects\PluginMassCreation\fillpro
git status
git add .
git commit -m "Harden FillPro v1 launch extension"
git push origin main
```

Root docs/build files:

```bat
cd /d D:\root\projects\PluginMassCreation
dir FILLPRO_*.md
```
