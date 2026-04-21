# Portfolio Prototype (React + Vite + Node API)

This prototype includes:
- React frontend (Vite)
- Express backend API
- Server-side file storage in `uploads/`
- MongoDB for asset metadata (Mongoose)

## Prerequisites

- Node.js
- A running MongoDB instance (local install, Docker, or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env and set MONGODB_URI if needed
npm run dev
```

The frontend runs on `http://localhost:5173` and the API on `http://localhost:4000`.

### Example `MONGODB_URI` values

- Local: `mongodb://127.0.0.1:27017/portfolio_proto`
- Atlas: `mongodb+srv://USER:PASS@cluster.example.mongodb.net/portfolio_proto?retryWrites=true&w=majority`

## API Endpoints

- `GET /api/assets` - list uploaded assets
- `POST /api/assets` - upload one asset (`multipart/form-data`, field name: `asset`)
- `DELETE /api/assets/:id` - remove asset and file

## Notes

- Binary files live in `uploads/` on the server; metadata lives in MongoDB.
- The `uploads/` directory contents are git-ignored.
