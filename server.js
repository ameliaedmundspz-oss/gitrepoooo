const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.post("/create-repos", async (req, res) => {
  try {
    const { username, token, repos, files } = req.body;

    if (!username || !token) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const results = [];

    for (let repo of repos) {
      // CREATE REPO
      const createRes = await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: repo,
          private: true
        })
      });

      const repoData = await createRes.json();

      if (repoData.message && createRes.status !== 201) {
        results.push({ repo, error: repoData.message });
        continue;
      }

      // UPLOAD FILES
      for (let file of files || []) {
        await fetch(`https://api.github.com/repos/${username}/${repo}/contents/${file.name}`, {
          method: "PUT",
          headers: {
            Authorization: `token ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: "initial commit",
            content: Buffer.from(file.content).toString("base64")
          })
        });
      }

      results.push({ repo, status: "created + files uploaded" });
    }

    res.json(results);
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
