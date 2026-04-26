# FillPro Public Site

Public support and privacy pages for FillPro, a Chrome extension for private local web-form autofill.

This repository is intentionally small. It hosts the Chrome Web Store-facing legal and support pages without publishing the private extension workspace, launch research, test artifacts, or internal strategy notes.

## Pages

- `index.html` - public product/support landing page
- `privacy-policy.html` - Chrome Web Store privacy policy URL
- `support.html` - support, known limits, troubleshooting, and contact

## Local Preview

Open `index.html` directly in a browser, or serve the folder with any static server.

## GitHub Pages

The included workflow deploys the static site from the repository root using GitHub Pages Actions.

Expected production URLs after publishing under `StealthyExpertX/fillpro-site`:

- `https://stealthyexpertx.github.io/fillpro-site/`
- `https://stealthyexpertx.github.io/fillpro-site/privacy-policy.html`
- `https://stealthyexpertx.github.io/fillpro-site/support.html`
