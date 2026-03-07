const express = require("express");
const path = require("path");
const app = express();

// Serve static files from the root directory
app.use("/meeting-program", express.static(path.join(__dirname, ".")));

// Serve index.html for the base path
app.get("/meeting-program", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start the server
const port = 8000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/meeting-program`);
});
