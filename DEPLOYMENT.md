# Completely free deployment — GitHub Pages

This version is designed to run without Cloudflare, Netlify, paid APIs, or a paid AI service.

## What stays free
- Static hosting: GitHub Pages
- HTTPS: GitHub Pages
- VIN decoding: public NHTSA vPIC API
- Service assistant: runs entirely in the visitor's browser
- Service-request draft: stored locally in the visitor's browser
- Request handoff: copy/share/text/email using the visitor's device and Christian's configured contact details

## Recommended repository
Create a separate **public** GitHub repository named:

`christians-auto-repair`

GitHub Pages on GitHub Free requires a public repository.

After that repository exists, copy the contents of this folder into the new repository root:
`christians-auto-repair/`

The new public repository root should contain `index.html`, `styles.css`, `script.js`, `config.js`, `manifest.webmanifest`, `favicon.svg`, `robots.txt`, and `404.html`.

Then enable GitHub Pages:
1. Open the new repository.
2. Settings → Pages.
3. Source: **Deploy from a branch**.
4. Branch: **main**.
5. Folder: **/(root)**.
6. Save.

The free site URL will be:
`https://Zdaman3030.github.io/christians-auto-repair/`

## Business configuration
Edit only `config.js` to add Christian's confirmed:
- phone display text
- phone `tel:` link
- SMS `sms:` link
- email display text
- email `mailto:` link
- service area
- hours

## VIN decoding
VIN decoding uses the public NHTSA vPIC API. Manual vehicle entry always remains available if the external VIN service is unavailable.

## Smart service assistant
The service assistant is fully browser-based and costs nothing to run. It handles common service-intake questions, symptom triage, safety escalation, and request preparation. It is intentionally not presented as a definitive vehicle diagnosis.

## No backend required
The website does not require a server, database, paid form service, or paid AI API. Once Christian's phone/email is configured, the reviewed request can be copied, shared, texted, or emailed from the customer's device.
