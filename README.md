<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This repo bundles a Vite frontend (React) with an Express API that talks to Gemini (Vertex AI or API key) and NVIDIA models.

## Local setup

1. Install dependencies at the repository root (workspaces take care of the server as well):
   ```bash
   npm install
   ```
2. Create a `.env` in the repo root (see the existing `.env` sample). Minimum variables:
   ```
   GEMINI_API_KEY=...                # optional when using Vertex AI/ADC
   NVIDIA_API_KEY=...
   GOOGLE_APPLICATION_CREDENTIALS_JSON=...   # or leave empty if you rely on ADC locally
   # GOOGLE_APPLICATION_CREDENTIALS_BASE64=...
   VITE_API_URL=http://localhost:8080
   ```
   Provide your service-account JSON inline (or via the base64 variant) so no local secret files are needed.
3. Start the backend:
   ```bash
   npm run dev --workspace server
   ```
4. In another terminal, run the frontend:
   ```bash
   npm run dev
   ```
   The UI lives at <http://localhost:5173> and calls the API using the `VITE_API_URL` you configured.

## Deploying the frontend (Vercel)

1. Push your changes and create a Vercel project pointing to the repository root.
2. Keep the default build command (`npm run build`) and output directory (`dist`); only the frontend is built on Vercel.
3. Set `VITE_API_URL` in Vercel Project Settings to the public URL of your Cloud Run service (do **not** append `/analyze`; the frontend adds it automatically).
4. Add any other public-facing variables as `VITE_*` entries when needed.
5. Deploy. The frontend will call the Cloud Run backend directly.

> If you prefer to keep the `/api/analyze` route on Vercel, convert `api/analyze.ts` into a lightweight proxy that forwards requests to Cloud Run. Otherwise, you may remove the route entirely.

## Deploying the backend (Cloud Run)

1. Enable Vertex AI in your Google Cloud project and choose (or create) a service account with `Vertex AI User` plus permission to access any required secrets (for example, Secret Manager).
2. Build the Docker image using the new `server/Dockerfile`:
   ```bash
   gcloud builds submit server \
     --tag gcr.io/$PROJECT_ID/umbrella-server
   ```
3. Deploy the container to Cloud Run:
   ```bash
   gcloud run deploy umbrella-server \
     --image gcr.io/$PROJECT_ID/umbrella-server \
     --region <your-region> \
     --platform managed \
     --allow-unauthenticated \
     --service-account <service-account-with-vertex>
   ```
4. Configure environment variables for the service (Console > Cloud Run > Variables & Secrets). Common values:
   - `GOOGLE_CLOUD_LOCATION` (for example `us-central1` or `southamerica-east1`).
   - `NVIDIA_API_KEY` (or reference a Secret Manager entry).
   - `GEMINI_API_KEY` if you choose the direct API key path. When omitted, the backend uses Application Default Credentials (ADC) from the attached service account.
   - No file-based secrets are required; use `NVIDIA_API_KEY`/`NVIDIA_API_KEY_BASE64` and `GOOGLE_APPLICATION_CREDENTIALS_JSON`/`GOOGLE_APPLICATION_CREDENTIALS_BASE64` as needed or rely on ADC.

Once deployed, copy the public Cloud Run URL and update `VITE_API_URL` (locally and/or on Vercel) to point to it.

## Useful tips

- The Express app lives in `server/src/app.ts`. When running on Cloud Run the service listens on the port provided via `PORT` (already handled in `server/src/index.ts`).
- `server/Dockerfile` is optimized for Cloud Run; if you use a different runtime (for example, Cloud Functions), ensure `npm run build` executes before `npm start`.
- Keep secrets out of version control. Use `.env` only for local development and rely on Secret Manager or platform-specific environment variables in production.
