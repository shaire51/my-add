const express = require("express");
const pool = require("../db");

const router = express.Router();

// 取得會議列表
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
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
    `);

    res.json(rows);
  } catch (err) {
    console.error("❌ 讀取會議失敗:", err);
    res.status(500).json({ message: "資料庫錯誤" });
  }
});

// 新增會議
router.post("/", async (req, res) => {
  const { name, unit, date, start_time, end_time, people, reporter, place } =
    req.body;

  try {
    const [result] = await pool.query(
      `
      INSERT INTO meetings 
      (name, unit, date, start_time, end_time, people, reporter, place)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [name, unit, date, start_time, end_time, people, reporter, place]
    );

    res.status(201).json({
      message: "新增成功",
      id: result.insertId,
    });
  } catch (err) {
    console.error("❌ 新增失敗:", err);
    res.status(500).json({ message: "資料庫錯誤" });
  }
});

// 刪除會議
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM meetings WHERE id = ?", [
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "找不到這筆會議" });
    }

    res.json({ message: "刪除成功" });
  } catch (err) {
    console.error("❌ 刪除失敗:", err);
    res.status(500).json({ message: "資料庫錯誤" });
  }
});

module.exports = router;
