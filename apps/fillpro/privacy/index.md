# FillPro Privacy

Last updated: 2026-06-12

FillPro stores profiles, custom fields, saved rules, and upload references locally in Chrome extension storage. It does not run a cloud profile service and does not collect form values on a server.

## Short version

- No account is required for the free extension.
- Profiles stay on the user's device.
- FillPro skips passwords, payment cards, CVCs, government IDs, tax IDs, and one-time codes.
- Pro billing is handled by ExtensionPay and Stripe.
- Support emails are separate from local extension data.

## Data map

| Data | Where it lives | Why it exists | How to remove it |
| --- | --- | --- | --- |
| Profiles and custom fields | Local Chrome extension storage | To fill forms the user chooses to fill | Delete the profile or uninstall the extension |
| Saved file references and uploads | Device and extension storage | To match document upload fields | Remove the file from the profile or delete the profile |
| License status | ExtensionPay and Stripe | To unlock Pro features | Contact support for billing help |
| Support messages | Email provider and support inbox | To answer questions or investigate bugs | Ask for the conversation to be deleted |

## Sensitive fields

FillPro is not a password manager, payment wallet, identity vault, tax vault, or authentication tool. It tries to avoid passwords, payment cards, CVCs, bank fields, government IDs, tax IDs, Social Security numbers, and one-time codes.

## Rights and requests

Users can inspect and edit local profile data inside FillPro. Users can delete profiles inside FillPro, clear extension storage, or uninstall the extension. Local profile data cannot be deleted remotely because it is not stored remotely.

Privacy contact: https://stealthyapps.com/contact/?topic=privacy&reason=privacy_question&product=FillPro
