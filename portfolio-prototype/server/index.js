import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import multer from 'multer'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'

const app = express()
const PORT = 4000
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const uploadsDir = path.join(projectRoot, 'uploads')

const assetSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  originalName: { type: String, required: true },
  fileName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  url: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})

const Asset = mongoose.model('Asset', assetSchema)

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(uploadsDir))

function toClient(doc) {
  return {
    id: doc.id,
    title: doc.title,
    originalName: doc.originalName,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    size: doc.size,
    url: doc.url,
    createdAt: doc.createdAt.toISOString(),
  }
}

async function ensureUploadsDir() {
  await fs.mkdir(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const timestamp = Date.now()
    const safeOriginal = file.originalname.replace(/\s+/g, '-')
    cb(null, `${timestamp}-${safeOriginal}`)
  },
})

const upload = multer({ storage })

app.get('/api/assets', async (_req, res) => {
  try {
    const docs = await Asset.find().sort({ createdAt: -1 }).lean()
    const assets = docs.map((d) => toClient(d))
    res.json({ assets })
  } catch {
    res.status(500).json({ error: 'Could not load assets.' })
  }
})

app.post('/api/assets', upload.single('asset'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a file.' })
  }

  const payload = {
    id: crypto.randomUUID(),
    title: req.body.title?.trim() || req.file.originalname,
    originalName: req.file.originalname,
    fileName: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
    url: `/uploads/${req.file.filename}`,
  }

  try {
    const doc = await Asset.create(payload)
    res.status(201).json({ asset: toClient(doc) })
  } catch {
    await fs.rm(path.join(uploadsDir, req.file.filename), { force: true })
    res.status(500).json({ error: 'Could not save uploaded file.' })
  }
})

app.delete('/api/assets/:id', async (req, res) => {
  try {
    const target = await Asset.findOne({ id: req.params.id }).lean()

    if (!target) {
      return res.status(404).json({ error: 'Asset not found.' })
    }

    await Asset.deleteOne({ id: req.params.id })
    await fs.rm(path.join(uploadsDir, target.fileName), { force: true })

    res.status(204).send()
  } catch {
    res.status(500).json({ error: 'Could not delete asset.' })
  }
})

async function start() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('Missing MONGODB_URI. Copy .env.example to .env and set your connection string.')
    return
  }

  await ensureUploadsDir()
  await mongoose.connect(uri)
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`)
  })
}

start().catch((error) => {
  console.error('Startup failed:', error)
})
