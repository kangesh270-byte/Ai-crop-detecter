import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const app = express();
const PORT = 3000;

// Initialize Database
const db = new Database("crops.db");

// Migration: Add health_score column if it doesn't exist
const tableInfo = db.prepare("PRAGMA table_info(scans)").all() as any[];
const hasHealthScore = tableInfo.some(col => col.name === 'health_score');
if (!hasHealthScore) {
  try {
    db.exec("ALTER TABLE scans ADD COLUMN health_score INTEGER DEFAULT 100");
    console.log("Migration: Added health_score column to scans table.");
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    crop_name TEXT,
    disease_name TEXT,
    confidence REAL,
    severity TEXT,
    solutions TEXT,
    image_data TEXT,
    health_score INTEGER DEFAULT 100
  );

  CREATE TABLE IF NOT EXISTS fertilizers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crop_id INTEGER,
    name TEXT,
    quantity TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    next_application DATETIME
  );

  CREATE TABLE IF NOT EXISTS growth_stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crop_name TEXT,
    stage TEXT, -- Seed, Vegetative, Flowering, Harvest
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS crop_knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crop_name TEXT UNIQUE,
    description TEXT,
    ideal_temperature TEXT,
    water_requirement TEXT,
    common_diseases TEXT, -- JSON array
    fertilizer_tips TEXT
  );
`);

// Seed Crop Knowledge if empty
const knowledgeCount = db.prepare("SELECT COUNT(*) as count FROM crop_knowledge").get() as any;
if (knowledgeCount.count === 0) {
  const seedData = [
    {
      name: 'Tomato',
      desc: 'A widely grown fruit, often treated as a vegetable in cooking.',
      temp: '20°C - 30°C',
      water: 'Regular, deep watering at the base.',
      diseases: JSON.stringify(['Late Blight', 'Early Blight', 'Leaf Mold', 'Septoria Leaf Spot']),
      tips: 'Use calcium-rich fertilizer to prevent blossom end rot.'
    },
    {
      name: 'Rice',
      desc: 'A staple cereal grain, primarily grown in flooded fields.',
      temp: '20°C - 35°C',
      water: 'High, requires standing water during most growth stages.',
      diseases: JSON.stringify(['Blast', 'Bacterial Leaf Blight', 'Sheath Blight']),
      tips: 'Apply Nitrogen in split doses for better yield.'
    },
    {
      name: 'Wheat',
      desc: 'A major cereal grain, grown in temperate climates.',
      temp: '15°C - 25°C',
      water: 'Moderate, critical during tillering and flowering.',
      diseases: JSON.stringify(['Rust', 'Powdery Mildew', 'Loose Smut']),
      tips: 'Ensure proper drainage to avoid root rot.'
    },
    {
      name: 'Potato',
      desc: 'A starchy tuberous crop, grown underground.',
      temp: '15°C - 20°C',
      water: 'Consistent moisture, avoid waterlogging.',
      diseases: JSON.stringify(['Late Blight', 'Scab', 'Black Scurf']),
      tips: 'Hilling is essential to protect tubers from sunlight.'
    }
  ];

  const insert = db.prepare(`
    INSERT INTO crop_knowledge (crop_name, description, ideal_temperature, water_requirement, common_diseases, fertilizer_tips)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  seedData.forEach(crop => {
    insert.run(crop.name, crop.desc, crop.temp, crop.water, crop.diseases, crop.tips);
  });
  console.log("Seed data: Added crop knowledge.");
}

app.use(express.json({ limit: '10mb' }));

// API Routes
app.get("/api/crop-guide", (req, res) => {
  try {
    const guide = db.prepare("SELECT * FROM crop_knowledge").all();
    res.json(guide);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch crop guide" });
  }
});
app.get("/api/history", (req, res) => {
  try {
    const scans = db.prepare("SELECT * FROM scans ORDER BY timestamp DESC").all();
    res.json(scans);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

app.get("/api/dashboard-stats", (req, res) => {
  try {
    const totalScans = db.prepare("SELECT COUNT(*) as count FROM scans").get() as any;
    const healthyCount = db.prepare("SELECT COUNT(*) as count FROM scans WHERE severity = 'Low' OR disease_name = 'Healthy'").get() as any;
    const diseasedCount = db.prepare("SELECT COUNT(*) as count FROM scans WHERE severity != 'Low' AND disease_name != 'Healthy'").get() as any;
    const highRiskCount = db.prepare("SELECT COUNT(*) as count FROM scans WHERE severity = 'High'").get() as any;
    
    const avgHealth = db.prepare("SELECT AVG(health_score) as avg FROM scans").get() as any;
    
    const diseaseStats = db.prepare(`
      SELECT disease_name, COUNT(*) as count 
      FROM scans 
      WHERE disease_name != 'Healthy' 
      GROUP BY disease_name 
      ORDER BY count DESC 
      LIMIT 5
    `).all();

    const monthlyStats = db.prepare(`
      SELECT strftime('%m', timestamp) as month, COUNT(*) as count 
      FROM scans 
      GROUP BY month
    `).all();

    const fertilizers = db.prepare("SELECT * FROM fertilizers ORDER BY date DESC LIMIT 5").all();

    res.json({
      summary: {
        total: totalScans.count || 0,
        healthy: healthyCount.count || 0,
        diseased: diseasedCount.count || 0,
        highRisk: highRiskCount.count || 0
      },
      avgHealth: Math.round(avgHealth.avg || 100),
      diseaseStats: diseaseStats || [],
      monthlyStats: monthlyStats || [],
      fertilizers: fertilizers || []
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/save-scan", (req, res) => {
  const { crop_name, disease_name, confidence, severity, solutions, image_data } = req.body;
  
  // Calculate a mock health score based on severity
  let health_score = 100;
  if (severity === 'High') health_score = 30;
  else if (severity === 'Medium') health_score = 65;
  else if (disease_name === 'Healthy') health_score = 100;
  else health_score = 85;

  const info = db.prepare(`
    INSERT INTO scans (crop_name, disease_name, confidence, severity, solutions, image_data, health_score)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(crop_name, disease_name, confidence, severity, JSON.stringify(solutions), image_data, health_score);
  res.json({ id: info.lastInsertRowid });
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
