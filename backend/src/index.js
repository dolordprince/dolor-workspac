require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "dolor-secret";
const PORT = process.env.PORT || 4000;
const users = new Map();

app.post("/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (users.has(email)) return res.status(409).json({ message: "Email exists" });
  const hash = await bcrypt.hash(password, 10);
  users.set(email, { name, email, hash });
  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "7d" });
  res.status(201).json({ token, user: { name, email } });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.get(email);
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  const match = await bcrypt.compare(password, user.hash);
  if (!match) return res.status(401).json({ message: "Invalid credentials" });
  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { name: user.name, email } });
});

app.post("/ai/chat", async (req, res) => {
  const { message, history = [] } = req.body;
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3-8b-instruct",
          messages: [
            {
              role: "system",
              content: "You are REACT.DAV AI assistant built by David Omovie."
            },
            ...history,
            { role: "user", content: message }
          ]
        })
      }
    );
    const data = await response.json();
    res.json({ reply: data.choices[0].message.content });
  } catch (e) {
    res.status(500).json({ message: "AI error" });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", version: "3.0.0" });
});

app.listen(PORT, () => console.log(`REACT.DAV API on port ${PORT}`));
