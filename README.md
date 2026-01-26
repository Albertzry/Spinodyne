# Spinodyne
AI platform that spots early disc trouble and shows how to keep your spine moving strong.

celery -A app.worker.celery_app worker --loglevel=info
uvicorn app.main:app --host 0.0.0.0 --port 25792 --reload
npm run dev -- --port 25320 --host 0.0.0.0
