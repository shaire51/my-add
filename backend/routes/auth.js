const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db");

const router = express.Router(); // ⭐ 這行一定要有

router.post("/login", async (req, res) => {
  const { empId, password } = req.body;

  if (!empId || !password) {
    return res.status(400).json({ message: "請輸入帳號與密碼" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT * FROM employees WHERE emp_id = ?",
      [empId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "帳號不存在" });
    }

    const user = rows[0];

    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      return res.status(401).json({ message: "密碼錯誤" });
    }

    res.json({
      message: "登入成功",
      user: {
        id: user.id,
        empId: user.emp_id,
        name: user.name,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "資料庫錯誤" });
  }
});

module.exports = router;
