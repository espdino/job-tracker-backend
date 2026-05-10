require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "supersecretkey_change_this";

const cors = require("cors");

const express = require("express");
const app = express();
let jobs = [];
let currentId = 1;

app.use(cors());
app.use(express.json());

const allowedStatuses = ["Applied", "Interview", "Offer", "Rejected"];

app.post("/jobs", authMiddleware, async (req, res) => {
  try {
    const { company, position, status, notes, appliedDate } = req.body;
    const userId = req.user.userId;

    if (!company || !position) {
      return res.status(400).json({
        message: "Company and position are required",
      });
    }

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

    const result = await pool.query(
      `INSERT INTO jobs (company, position, status, notes, user_id)
   VALUES ($1, $2, $3, $4, $5)
   RETURNING *`,
      [company, position, status || "Applied", notes || "", userId],
    );

    res.json({
      message: "Job added successfully",
      job: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/jobs", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status, company, search, sort } = req.query;

    let query = "SELECT * FROM jobs";
    let conditions = [];
    let values = [];

    // 🔹 ALWAYS filter by user
    values.push(userId);
    conditions.push(`user_id = $${values.length}`);

    // 🔹 Status filter
    if (status) {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status filter" });
      }

      values.push(status);
      conditions.push(`status = $${values.length}`);
    }

    // 🔹 Company filter
    if (company) {
      values.push(company);
      conditions.push(`LOWER(company) = LOWER($${values.length})`);
    }

    // 🔹 Search (company OR position)
    if (search) {
      values.push(`%${search}%`);
      conditions.push(
        `(LOWER(company) LIKE LOWER($${values.length}) OR LOWER(position) LIKE LOWER($${values.length}))`,
      );
    }

    // 🔹 Combine conditions (always at least user_id exists)
    query += " WHERE " + conditions.join(" AND ");

    // 🔹 Sorting
    if (sort === "date") {
      query += " ORDER BY applied_date DESC";
    } else {
      query += " ORDER BY id DESC";
    }

    const result = await pool.query(query, values);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/jobs/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user.userId;

    const result = await pool.query(
      "DELETE FROM jobs WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({
      message: "Job deleted",
      job: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/jobs/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user.userId;
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const { company, position, status, notes, applied_date } = req.body;

    // ✅ Validate status if provided
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const result = await pool.query(
      `
  UPDATE jobs
  SET
    company = $1,
    position = $2,
    status = $3,
    notes = $4,
    applied_date = $5
  WHERE id = $6
  `,
      [company, position, status, notes, applied_date, req.params.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({
      message: "Job updated",
      job: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

app.post("/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // check if user exists
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
      [email, hashedPassword],
    );

    res.json({
      message: "User created",
      user: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // create token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({
      message: "Login successful",
      token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded; // ✅ THIS is critical
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}
