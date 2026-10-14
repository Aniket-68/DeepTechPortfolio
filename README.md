# DeepTech portfolio

Portfolio website for DeepTech (IT software development and maintenance: AI applications, Android apps, web apps)
with working contact and call-booking forms and a password-protected admin panel.

## What is inside

| Part | What it does |
| --- | --- |
| `public/` | The website. Projects, contact details and screenshots are loaded from the server. |
| `admin/` | Admin panel at `/admin`: add, edit, reorder and delete projects, upload screenshots, read enquiries, export CSV, change settings and password. |
| `server.js` | Express server, JSON file storage (`data/db.json`), form validation, rate limiting, email notifications. |

## Run it

Requires Node.js 18 or newer.

```bash
npm install
cp .env.example .env     # Windows: copy .env.example .env
npm start
```

- Website: http://localhost:3000
- Admin: http://localhost:3000/admin

On the first start the server prints an admin password (or uses `ADMIN_PASSWORD` from `.env`).
Change it in Admin > Settings. To reset it, delete `data/admin.json` and restart.

## Email notifications

Fill in the `SMTP_*` values in `.env` (the file explains how to create a Gmail app password).
Without them the forms still work: every enquiry is saved and appears in Admin > Enquiries.

## Managing projects

Open `/admin`, then Projects. Upload a screenshot for each project and mark it as "Sample" or not.
On the first start the list is seeded from `public/projects.js`. After that the admin panel is the source of truth
and data lives in `data/db.json` (not in Git). Back this file up, and keep `public/screenshots/up-*` (uploads) with it.

## Deploying

Any Node host works (Render, Railway, a VPS). Set the environment variables from `.env.example`,
set `TRUST_PROXY=1` behind HTTPS, and attach a persistent disk to `data/` and `public/screenshots/`.

## Security notes

- Admin sessions use a signed, HttpOnly, SameSite=Strict cookie. Login is rate limited.
- Forms are validated on the server, rate limited and protected by a honeypot field.
- Uploads accept JPG, PNG and WebP only (checked by content) up to 5 MB.
- Never commit `.env` or `data/`.
