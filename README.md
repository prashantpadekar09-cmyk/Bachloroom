<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/56c06695-2992-4336-8e33-df7f3d84e69d

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy On Render

As of March 26, 2026, Render still offers a free web service tier. This repo is now configured for Render with [render.yaml](./render.yaml).

1. Push this project to GitHub.
2. In Render, choose `New +` -> `Blueprint`.
3. Select your repository and deploy the blueprint.
4. Set any missing environment variables in Render:
   `GEMINI_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID`

Important:
- The app uses SQLite in `data/database.sqlite`.
- On Render free web services, the filesystem is ephemeral, so SQLite data can reset after redeploys/restarts.
- For persistent production data, move the database to an external service.
