const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(cors());

// 改成你的資料庫名稱
const db = mysql.createPool({
  host: "192.168.71.12", // 你 phpMyAdmin 那台主機 IP
  port: 3306,
  user: "meeting_user", // ★ 改成新的使用者
  password: "tcdb123456", // ★ 跟剛剛 CREATE USER 裡的一樣
  database: "meetings",
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
