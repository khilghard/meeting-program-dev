const express = require("express");
const path = require("path");
const app = express();

// Serve static files from the root directory
app.use("/meeting-program", express.static(path.join(__dirname, ".")));

// Redirect /meeting-program to /meeting-program/ so relative paths resolve correctly
app.get("/meeting-program", (req, res) => {
  if (req.path === "/meeting-program" && !req.path.endsWith("/")) {
    return res.redirect(301, "/meeting-program/");
  }
  res.sendFile(path.join(__dirname, "index.html"));
});

// Serve CMS pages under /meeting-program/cms so relative paths resolve correctly
app.use("/meeting-program/cms", express.static(path.join(__dirname, "cms")));
app.get("/meeting-program/cms", (req, res) => {
  if (req.path === "/meeting-program/cms" && !req.path.endsWith("/")) {
    return res.redirect(301, "/meeting-program/cms/");
  }
  res.sendFile(path.join(__dirname, "cms", "index.html"));
});

app.use("/meeting-program/cms_agenda", express.static(path.join(__dirname, "cms_agenda")));
app.get("/meeting-program/cms_agenda", (req, res) => {
  if (req.path === "/meeting-program/cms_agenda" && !req.path.endsWith("/")) {
    return res.redirect(301, "/meeting-program/cms_agenda/");
  }
  res.sendFile(path.join(__dirname, "cms_agenda", "index.html"));
});

// Start the server
const port = 8000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/meeting-program`);
  console.log(`CMS available at http://localhost:${port}/meeting-program/cms`);
  console.log(`Agenda CMS available at http://localhost:${port}/meeting-program/cms_agenda`);
});
