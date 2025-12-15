const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(cors());

const db = mysql.createPool({
  host: "192.168.71.12",
  port: 3306,
  user: "meeting_user",
  password: "tcdb123456",
  database: "meetings",
  timezone: "+08:00",
});

// 測試 DB 連線
db.getConnection((err, conn) => {
  if (err) {
    console.log("❌ 資料庫連線失敗：", err);
  } else {
    console.log("✅ 資料庫連線成功");
    conn.release();
  }
});

// 新增會議 API

app.get("/api/meetings", (req, res) => {
  const sql = `
    SELECT 
      id,
      name,
      unit,
      DATE_FORMAT(date, '%Y-%m-%d') AS date,
      TIME_FORMAT(start_time, '%H:%i') AS start_time,
      TIME_FORMAT(end_time, '%H:%i') AS end_time,
      people,
      reporter,
      place
    FROM meetings
  `;

  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ message: "資料庫錯誤" });
    res.json(rows);
  });
});

app.post("/api/meetings", (req, res) => {
  const { name, unit, date, start_time, end_time, people, reporter, place } =
    req.body;

  const sql = `
    INSERT INTO meetings 
    (name, unit, date, start_time, end_time, people, reporter, place)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [name, unit, date, start_time, end_time, people, reporter, place],
    (err, result) => {
      if (err) {
        console.log("❌ 新增失敗:", err);
        return res.status(500).json({ message: "資料庫錯誤" });
      }

      res.status(201).json({
        message: "新增成功",
        id: result.insertId,
      });
    }
  );
});

app.listen(PORT, () => {
  console.log(`🚀 後端服務啟動：http://localhost:${PORT}`);
});

// 刪除會議
app.delete("/api/meetings/:id", (req, res) => {
  const id = req.params.id;

  const sql = "DELETE FROM meetings WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.log("❌ 刪除失敗:", err);
      return res.status(500).json({ message: "資料庫錯誤" });
    }

    if (result.affectedRows === 0) {
      // 找不到這筆
      return res.status(404).json({ message: "找不到這筆會議" });
    }

    res.json({ message: "刪除成功" });
  });
});
