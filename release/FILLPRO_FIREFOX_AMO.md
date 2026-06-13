# FillPro Firefox Add-ons Submission

Upload package: `dist/fillpro-firefox.zip`

## Listing

Name:
FillPro - Private Autofill Forms

Summary:
Private autofill for job applications, signup, intake, vendor, demo, and support forms. Local profiles, uploads, undo.

Category:
Productivity

Homepage:
https://stealthyapps.com/fillpro/

Support:
https://stealthyapps.com/contact/?topic=product&product=FillPro

Privacy policy:
https://stealthyapps.com/fillpro/privacy/

## Description

Use the long description from `FILLPRO_MARKETPLACE_METADATA.md`.

## Images

AMO screenshots:

- `fillpro-site/assets/marketplace/fillpro-screenshot-fill-page-1280x800.png`
- `fillpro-site/assets/marketplace/fillpro-screenshot-profiles-1280x800.png`
- `fillpro-site/assets/marketplace/fillpro-screenshot-modern-forms-1280x800.png`
- `fillpro-site/assets/marketplace/fillpro-screenshot-privacy-1280x800.png`
- `fillpro-site/assets/marketplace/fillpro-screenshot-undo-1280x800.png`

## Technical Notes

- The Firefox build injects `browser_specific_settings.gecko.id`.
- The Firefox build removes Chrome `sidePanel` permission and maps the panel to `sidebar_action`.
- The Firefox build converts the MV3 background service worker to a background script entry.
- Keep version at `1.0.0`.

## Review Notes

FillPro does not use obfuscated code. Profile data is stored locally in browser extension storage. Billing for Pro is handled by ExtensionPay and Stripe.
