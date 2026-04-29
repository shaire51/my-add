const express = require("express");
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");
const upload = require("../middleware/uploadMeetingImage");

const router = express.Router();

function isAdmin(user) {
  return !!user?.permissions?.includes("permission.assign.admin");
}

function canEditOrDelete(ownerEmpId, user) {
  const owner = String(ownerEmpId || "").trim();
  const sub = String(user?.sub || "").trim();
  return isAdmin(user) || owner === sub;
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
        is_video,
        participant_count,
        created_by,
        attachment_name,
        attachment_type,
        attachment_path
      FROM meetings
      ORDER BY date ASC, start_time ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error("讀取會議失敗:", err);
    res.status(500).json({ message: "資料庫錯誤" });
  }
});

router.get("/search", async (req, res) => {
  const { from, to, place, q, reporter, unit, is_video } = req.query;

  if (!from || !to) {
    return res.status(400).json({ message: "from、to 必填 (YYYY-MM-DD)" });
  }

  let where = `WHERE date BETWEEN ? AND ?`;
  const params = [from, to];

  if (place && place !== "all") {
    if (place === "2F") {
      where += ` AND (place LIKE ? OR place LIKE ? OR place LIKE ?)`;
      params.push("%二樓%", "%2樓%", "%2F%");
    } else if (place === "5F") {
      where += ` AND (place LIKE ? OR place LIKE ? OR place LIKE ?)`;
      params.push("%五樓%", "%5樓%", "%5F%");
    } else {
      where += ` AND place LIKE ?`;
      params.push(`%${place}%`);
    }
  }
  const keyword = String(q || "").trim();
  if (keyword) {
    where += ` AND (name LIKE ? OR unit LIKE ? OR reporter LIKE ? OR place LIKE ?)`;
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw, kw);
  }

  if (is_video === "1" || is_video === "0") {
    where += ` AND is_video = ?`;
    params.push(Number(is_video));
  }

  const reporterKeyword = String(reporter || "").trim();
  if (reporterKeyword) {
    where += ` AND reporter LIKE ?`;
    params.push(`%${reporterKeyword}%`);
  }

  const unitKeyword = String(unit || "").trim();
  if (unitKeyword) {
    where += ` AND unit LIKE ?`;
    params.push(`%${unitKeyword}%`);
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
        place,
        is_video,
        participant_count,
        created_by,
        attachment_name,
        attachment_type,
        attachment_path
      FROM meetings
      ${where}
      ORDER BY date ASC, start_time ASC
      `,
      params,
    );

    res.json(rows);
  } catch (err) {
    console.error("區間查詢失敗:", err);
    res.status(500).json({ message: "資料庫錯誤" });
  }
});

router.post("/", requireAuth, upload.single("attachment"), async (req, res) => {
  const {
    name,
    unit,
    date,
    start_time,
    end_time,
    people,
    reporter,
    place,
    is_video,
    participant_count,
  } = req.body;

  const createdBy = req.user.sub;
  if (!createdBy) {
    return res
      .status(401)
      .json({ message: "JWT 缺少 sub，無法寫入 created_by" });
  }

  const file = req.file || null;
  const attachment_name = file ? file.originalname : null;
  const attachment_type = file ? file.mimetype : null;
  const attachment_path = file ? `/uploads/meetings/${file.filename}` : null;

  try {
    const [result] = await pool.query(
      `
      INSERT INTO meetings 
      (
        name, unit, date, start_time, end_time,
        people, reporter, place, is_video, participant_count,
        created_by,
        attachment_name, attachment_type, attachment_path
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        String(is_video) === "1" ? 1 : 0,
        Number(participant_count) || 0,
        createdBy,
        attachment_name,
        attachment_type,
        attachment_path,
      ],
    );

    res.status(201).json({
      message: "新增成功",
      id: result.insertId,
    });
  } catch (err) {
    console.error("新增失敗:", err);
    res.status(500).json({ message: "資料庫錯誤" });
  }
});

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

    await pool.query("DELETE FROM meetings WHERE id = ?", [id]);
    res.json({ message: "刪除成功" });
  } catch (err) {
    console.error("刪除失敗:", err);
    res.status(500).json({ message: "資料庫錯誤" });
  }
});

router.put(
  "/:id",
  requireAuth,
  upload.single("attachment"),
  async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "id 不正確" });

    const {
      name,
      unit,
      date,
      start_time,
      end_time,
      people,
      reporter,
      place,
      is_video,
      participant_count,
    } = req.body;

    try {
      const [rows] = await pool.query(
        "SELECT created_by, attachment_name, attachment_type, attachment_path FROM meetings WHERE id = ?",
        [id],
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: "找不到這筆會議" });
      }

      const row = rows[0];
      const owner = row.created_by;

      if (!canEditOrDelete(owner, req.user)) {
        return res.status(403).json({ message: "沒有權限修改這筆會議" });
      }

      const file = req.file || null;

      const attachment_name = file ? file.originalname : row.attachment_name;
      const attachment_type = file ? file.mimetype : row.attachment_type;
      const attachment_path = file
        ? `/uploads/meetings/${file.filename}`
        : row.attachment_path;

      await pool.query(
        `
      UPDATE meetings
      SET
        name=?,
        unit=?,
        date=?,
        start_time=?,
        end_time=?,
        people=?,
        reporter=?,
        place=?,
        is_video=?,
        participant_count=?,
        attachment_name=?,
        attachment_type=?,
        attachment_path=?
      WHERE id=?
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
          String(is_video) === "1" ? 1 : 0,
          Number(participant_count) || 0,
          attachment_name,
          attachment_type,
          attachment_path,
          id,
        ],
      );

      res.json({ ok: true, id });
    } catch (err) {
      console.error("更新失敗:", err);
      res.status(500).json({ message: "更新失敗（資料庫錯誤）" });
    }
  },
);

module.exports = router;
