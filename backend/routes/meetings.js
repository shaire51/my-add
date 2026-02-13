const express = require("express");
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

const ADMIN_IDS = new Set(["41414"]);

function isAdmin(user) {
  return ADMIN_IDS.has(String(user?.sub || ""));
}

function canEditOrDelete(ownerEmpId, user) {
  return isAdmin(user) || String(ownerEmpId) === String(user.sub);
}

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
        place,
        created_by
      FROM meetings
    `);

    res.json(rows);
  } catch (err) {
    console.error("讀取會議失敗:", err);
    res.status(500).json({ message: "資料庫錯誤5645" });
  }
});

// 日期區間查詢（可選 place / q）
router.get("/search", async (req, res) => {
  const { from, to, place = "all", q = "" } = req.query;

  if (!from || !to) {
    return res.status(400).json({ message: "from、to 必填 (YYYY-MM-DD)" });
  }

  // where 條件與參數
  let where = `WHERE date BETWEEN ? AND ?`;
  const params = [from, to];

  // 地點/樓層過濾（依你 place 欄位內容調整）
  // 你目前 place 可能會是 "二樓會議室A" / "2F xxx" / "五樓..." 之類
  if (place !== "all") {
    if (place === "2F") {
      where += ` AND (place LIKE ? OR place LIKE ? OR place LIKE ?)`;
      params.push("%二樓%", "%2樓%", "%2F%");
    } else if (place === "5F") {
      where += ` AND (place LIKE ? OR place LIKE ? OR place LIKE ?)`;
      params.push("%五樓%", "%5樓%", "%5F%");
    } else {
      // 如果你想支援傳入任意 place 字串（例如 "201會議室"）
      where += ` AND place LIKE ?`;
      params.push(`%${place}%`);
    }
  }

  // 關鍵字模糊查（你想查哪些欄位就加哪些）
  const keyword = String(q || "").trim();
  if (keyword) {
    where += ` AND (name LIKE ? OR unit LIKE ? OR reporter LIKE ? OR place LIKE ?)`;
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw, kw);
  }

  try {
    const [rows] = await pool.query(
      `
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
      ${where}
      ORDER BY date ASC, start_time ASC
      `,
      params,
    );

    res.json(rows);
  } catch (err) {
    console.error(" 區間查詢失敗:", err);
    res.status(500).json({ message: "資料庫錯誤" });
  }
});

// 新增會議
router.post("/", requireAuth, async (req, res) => {
  console.log("req.user =", req.user);
  const { name, unit, date, start_time, end_time, people, reporter, place } =
    req.body;

  const createdBy = req.user.sub;

  if (!createdBy) {
    return res
      .status(401)
      .json({ message: "JWT 缺少 sub，無法寫入 created_by" });
  }

  try {
    const [result] = await pool.query(
      `
      INSERT INTO meetings 
      (name, unit, date, start_time, end_time, people, reporter, place, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name,
        unit,
        date,
        start_time,
        end_time,
        people,
        reporter,
        place,
        createdBy,
      ],
    );

    res.status(201).json({
      message: "新增成功",
      id: result.insertId,
    });
  } catch (err) {
    console.error(" 新增失敗:", err);
    res.status(500).json({ message: "資料庫錯誤" });
  }
});

// 刪除會議
router.delete("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "id 不正確" });

  try {
    const [rows] = await pool.query(
      "SELECT created_by FROM meetings WHERE id = ?",
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "找不到這筆會議" });
    }

    const owner = rows[0].created_by;

    if (!canEditOrDelete(owner, req.user)) {
      return res.status(403).json({ message: "沒有權限刪除這筆會議" });
    }

    const [result] = await pool.query("DELETE FROM meetings WHERE id = ?", [
      id,
    ]);

    res.json({ message: "刪除成功" });
  } catch (err) {
    console.error(" 刪除失敗:", err);
    res.status(500).json({ message: "資料庫錯誤" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { name, unit, date, start_time, end_time, people, reporter, place } =
    req.body;

  if (!id) return res.status(400).json({ message: "id 不正確" });

  try {
    const [rows] = await pool.query(
      "SELECT created_by FROM meetings WHERE id = ?",
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "找不到這筆會議" });
    }

    const owner = rows[0].created_by;

    if (!canEditOrDelete(owner, req.user)) {
      return res.status(403).json({ message: "沒有權限修改這筆會議" });
    }

    const [result] = await pool.query(
      `UPDATE meetings
       SET name=?, unit=?, date=?, start_time=?, end_time=?, people=?, reporter=?, place=?
       WHERE id=?`,
      [name, unit, date, start_time, end_time, people, reporter, place, id],
    );

    res.json({ ok: true, id });
  } catch (err) {
    console.error(" 更新失敗:", err);
    res.status(500).json({ message: "更新失敗（資料庫錯誤）" });
  }
});

module.exports = router;
