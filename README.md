# FillPro Website

Public website for [FillPro](https://stealthyapps.com/fillpro/), a private browser form autofill extension from Stealthy Apps.

FillPro is the only public product on the site right now. The structure is ready for future tools later: each product can get its own canonical product page, privacy notes, support route, sitemap entry, and Markdown mirror.

## Main Routes

- `/` - redirects to the FillPro product page
- `/fillpro/` - canonical product page
- `/fillpro/privacy/` - privacy policy
- `/support/` - support and troubleshooting
- `/contact/` - contact form
- `/sitemap.html` and `/sitemap.xml` - discovery routes
- `/llms.txt` and `/llms-full.txt` - plain-text product corpus

## Product Boundary

FillPro does not run a cloud profile account for form values. Saved profiles stay inside the browser extension unless the user exports them or manually includes them in a support message. Pro billing sends license and payment information to ExtensionPay and Stripe, not saved profile values. Sign-ins, cards, CVCs, one-time codes, and protected identity details should stay with the browser, password manager, payment wallet, or site controls users already trust for those jobs.

## Release

Current website content is aligned to FillPro 1.0.0 and last updated on 2026-07-13.
