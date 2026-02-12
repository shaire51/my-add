require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const meetingRoutes = require("./routes/meetings");
const loginRouter = require("./routes/login");
const requireAuth = require("./middleware/requireAuth");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/login", loginRouter);

app.use("/api/meetings", requireAuth, meetingRoutes);

app.listen(3001, () => {
  console.log(" Server running on http://localhost:3001");
});
