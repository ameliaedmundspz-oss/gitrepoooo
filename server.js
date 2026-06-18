import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());
app.use(express.static(".")); // serve index.html

// ------------------ GET REPOS ------------------
app.post("/get-repos", async (req, res) => {
  try {
    const { token } = req.body;

    const response = await fetch("https://api.github.com/user/repos", {
      headers: {
        Authorization: `token ${token}`
      }
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ------------------ CREATE REPOS + UPLOAD FILES ------------------
app.post("/create-repos", async (req, res) => {
  try {
    const { username, token, repos, files } = req.body;

    console.log("CREATE REQUEST:", req.body);

    const results = [];

    for (let repo of repos) {
      // 1. Create repo
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
      console.log("GitHub create repo:", repoData);

      if (repoData.message && repoData.message !== "created") {
        results.push({ repo, error: repoData.message });
        continue;
      }

      // 2. Upload files
      for (let file of files) {
        const uploadRes = await fetch(
          `https://api.github.com/repos/${username}/${repo}/contents/${file.name}`,
          {
            method: "PUT",
            headers: {
              Authorization: `token ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              message: "initial commit",
              content: Buffer.from(file.content).toString("base64")
            })
          }
        );

        const uploadData = await uploadRes.json();
        console.log("Upload:", uploadData);
      }

      results.push({ repo, status: "created + files uploaded" });
    }

    res.json(results);
  } catch (err) {
    console.error(err);
    res.json({ error: err.message });
  }
});

// ------------------ UPDATE REPOS ------------------
app.post("/update-repos", async (req, res) => {
  try {
    const { username, token, repos, files } = req.body;

    const results = [];

    for (let repo of repos) {
      for (let file of files) {
        await fetch(
          `https://api.github.com/repos/${username}/${repo}/contents/${file.name}`,
          {
            method: "PUT",
            headers: {
              Authorization: `token ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              message: "update file",
              content: Buffer.from(file.content).toString("base64")
            })
          }
        );
      }

      results.push({ repo, status: "updated" });
    }

    res.json(results);
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ------------------ DELETE REPOS ------------------
app.post("/delete-repos", async (req, res) => {
  try {
    const { username, token, repos } = req.body;

    const results = [];

    for (let repo of repos) {
      const delRes = await fetch(
        `https://api.github.com/repos/${username}/${repo}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `token ${token}`
          }
        }
      );

      results.push({ repo, status: delRes.status });
    }

    res.json(results);
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ------------------ START SERVER ------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
