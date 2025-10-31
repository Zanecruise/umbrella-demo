<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This project bundles a Vite frontend with an Express API that talks to Gemini and NVIDIA models.

## Local setup

1. Install dependencies at the repo root (workspaces will also install the server packages):
   ```bash
   npm install
   ```
2. Create a `.env` file in the project root (see `.env` for the current defaults) and keep secrets in `.secrets/`. Minimum variables:
   ```
   GEMINI_API_KEY=...
   NVIDIA_API_KEY=...
   VITE_API_URL=http://localhost:8080
   ```
   Alternatively, provide a Google service account credential by setting `GOOGLE_APPLICATION_CREDENTIALS=./.secrets/<file>.json` or `GOOGLE_APPLICATION_CREDENTIALS_JSON`.
3. Start the backend:
   ```bash
   npm run dev --workspace server
   ```
4. In another terminal start the Vite frontend:
   ```bash
   npm run dev
   ```
   The UI runs on <http://localhost:5173> and proxies requests to the API URL you configured.

## Deploying on Vercel

1. Push your changes and create a new Vercel project pointing to the repository root.
2. Leave the default build command (`npm run build`) and output directory (`dist`). Vercel will compile the Vite frontend and the `api/` serverless function automatically.
3. Define the following Environment Variables in Vercel (Project Settings → Environment Variables) for every environment you intend to use (Preview/Production):
   - `VITE_API_URL=/api`
   - `GEMINI_API_KEY` **or** one of:
     - `GOOGLE_APPLICATION_CREDENTIALS_JSON` (paste the raw JSON)
     - `GOOGLE_APPLICATION_CREDENTIALS_BASE64` (base64-encoded JSON)
   - `GOOGLE_PROJECT_ID` and `GOOGLE_CLOUD_LOCATION` if you rely on service-account based auth.
   - `NVIDIA_API_KEY`
4. If you store secrets as files locally, copy their contents into the corresponding environment variables above—Vercel cannot read from `.secrets/`.
5. Trigger a deployment. Once live, the frontend will call the serverless function at `/api/analyze`.

### Useful tips

- The Express server is exported from `server/src/app.ts`; Vercel uses `api/analyze.ts` to expose it as a serverless function.
- When adding new API routes, mirror them in both `server/src/app.ts` and the `api/` directory (or create lightweight routers that can be shared).
- Keep large model credentials out of version control; rely on Vercel Environment Variables or secrets management in production.
