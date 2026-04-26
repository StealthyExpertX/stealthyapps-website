# FillPro Public Site

Public support and privacy pages for FillPro, a Chrome extension for private local web-form autofill.

This repository is intentionally small. It hosts the Chrome Web Store-facing legal and support pages without publishing the private extension workspace, launch research, test artifacts, or internal strategy notes.

## Pages

- `index.html` - public product/support landing page
- `privacy-policy.html` - Chrome Web Store privacy policy URL
- `support.html` - support, known limits, troubleshooting, and contact
- `changelog.html` - public release notes page
- `developer-letter.html` - friendly note from the developer

## Local Preview

Open `index.html` directly in a browser, or serve the folder with any static server.

## Live Site

- Site: `https://stealthyexpertx.github.io/fillpro-site/`
- Privacy policy: `https://stealthyexpertx.github.io/fillpro-site/privacy-policy.html`
- Support: `https://stealthyexpertx.github.io/fillpro-site/support.html`
- Changelog: `https://stealthyexpertx.github.io/fillpro-site/changelog.html`
- Developer letter: `https://stealthyexpertx.github.io/fillpro-site/developer-letter.html`

## Voice Notes

The developer letter intentionally uses a more direct and human voice based on the public StealthyExpertX / RedstonerLabs profile tone: friendly, professional, tool-builder focused, and comfortable saying plainly what a product does and does not do.

## GitHub Pages

The included workflow deploys the static site from the repository root using GitHub Pages Actions.

If the repository ever needs to be recreated, publish from this folder with:

```powershell
gh auth login
gh repo create StealthyExpertX/fillpro-site --public --source . --remote origin --push
```

Pages should be configured for GitHub Actions.
