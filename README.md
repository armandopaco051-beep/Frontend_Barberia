# Blessed Barber Club Local Setup

This frontend is configured for local development against the Django backend in `../BackendBarber-Copia`.

## Frontend environment

Create or keep `FrontendBaber-Copia/.env.local` with:

```env
VITE_API_URL=http://127.0.0.1:8000/api/
```

## Backend setup

```powershell
cd BackendBarber-Copia
py -3.12 -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Backend URL: `http://127.0.0.1:8000`

## Frontend setup

```powershell
cd FrontendBaber-Copia
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## Notes

- The frontend reads its API base URL from `import.meta.env.VITE_API_URL` and falls back to `http://127.0.0.1:8000/api/`.
- The Django backend allows local requests from `http://localhost:5173` and `http://127.0.0.1:5173`.
- The backend uses `DATABASE_URL` when it is present in `BackendBarber-Copia/.env`. Leave it blank or remove it to use the local SQLite database at `BackendBarber-Copia/db.sqlite3`.
- `BackendBarber-Copia/.env` now stays local-only if you commit the new `.gitignore` and `.env` removal from the Git index. A safe template is available in `BackendBarber-Copia/.env.example`.
