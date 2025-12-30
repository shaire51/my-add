const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const meetingRoutes = require("./routes/meetings");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", authRoutes);
app.use("/api/meetings", meetingRoutes);

app.listen(3001, () => {
  console.log("🚀 Server running on http://localhost:3001");
});
