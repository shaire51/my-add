const express = require("express");
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");
const requirePermission = require("../middleware/requirePermission");

const router = express.Router();

// 查某員工目前權限
router.get(
  "/user/:empId",
  requireAuth,
  requirePermission("permission.manage.view"),
  async (req, res) => {
    try {
      const { empId } = req.params;

      const [empRows] = await pool.query(
        "SELECT id, emp_id, name FROM employees WHERE emp_id = ? LIMIT 1",
        [empId],
      );

      if (!empRows.length) {
        return res.status(404).json({ message: "找不到該員工" });
      }

      const employee = empRows[0];

      const [permissionRows] = await pool.query(
        `SELECT p.code, p.name, ep.granted_by, ep.granted_at
        FROM employee_permissions ep
        INNER JOIN permissions p ON p.id = ep.permission_id
        WHERE ep.employee_id = ?
        ORDER BY p.code ASC`,
        [employee.id],
      );

      return res.json({
        employee: {
          id: employee.id,
          empId: employee.emp_id,
          name: employee.name,
        },
        permissions: permissionRows,
      });
    } catch (err) {
      console.error("查詢員工權限失敗 =", err);
      return res.status(500).json({ message: "查詢員工權限失敗" });
    }
  },
);
// 新增某員工權限
router.post(
  "/grant",
  requireAuth,
  requirePermission("permission.assign"),
  async (req, res) => {
    try {
      const { empId, permissionCode } = req.body || {};

      if (!empId || !permissionCode) {
        return res
          .status(400)
          .json({ message: "empId 與 permissionCode 為必填" });
      }

      const [empRows] = await pool.query(
        "SELECT id, emp_id, name FROM employees WHERE emp_id = ? LIMIT 1",
        [empId],
      );

      if (!empRows.length) {
        return res.status(404).json({ message: "找不到該員工" });
      }

      const [permRows] = await pool.query(
        "SELECT id, code, name FROM permissions WHERE code = ? LIMIT 1",
        [permissionCode],
      );

      if (!permRows.length) {
        return res.status(404).json({ message: "找不到該權限" });
      }

      // 如果要賦予管理權限，必須額外有 permission.assign.admin
      const adminLevelPermissions = [
        "meeting.admin",
        "permission.assign",
        "permission.assign.admin",
        "permission.manage.view",
      ];
      if (
        adminLevelPermissions.includes(permissionCode) &&
        !req.user.permissions?.includes("permission.assign.admin")
      ) {
        return res.status(403).json({ message: "沒有賦予高階權限的資格" });
      }

      await pool.query(
        `INSERT IGNORE INTO employee_permissions (employee_id, permission_id, granted_by)
         VALUES (?, ?, ?)`,
        [empRows[0].id, permRows[0].id, req.user.sub],
      );

      return res.json({
        message: "權限新增成功",
        employee: empRows[0],
        permission: permRows[0],
      });
    } catch (err) {
      console.error("新增員工權限失敗 =", err);
      return res.status(500).json({ message: "新增員工權限失敗" });
    }
  },
);

// 移除某員工權限
router.post(
  "/revoke",
  requireAuth,
  requirePermission("permission.assign"),
  async (req, res) => {
    try {
      const { empId, permissionCode } = req.body || {};

      if (!empId || !permissionCode) {
        return res
          .status(400)
          .json({ message: "empId 與 permissionCode 為必填" });
      }

      const [empRows] = await pool.query(
        "SELECT id, emp_id, name FROM employees WHERE emp_id = ? LIMIT 1",
        [empId],
      );

      if (!empRows.length) {
        return res.status(404).json({ message: "找不到該員工" });
      }

      const [permRows] = await pool.query(
        "SELECT id, code, name FROM permissions WHERE code = ? LIMIT 1",
        [permissionCode],
      );

      if (!permRows.length) {
        return res.status(404).json({ message: "找不到該權限" });
      }

      await pool.query(
        `DELETE FROM employee_permissions
         WHERE employee_id = ? AND permission_id = ?`,
        [empRows[0].id, permRows[0].id],
      );

      return res.json({
        message: "權限移除成功",
        employee: empRows[0],
        permission: permRows[0],
      });
    } catch (err) {
      console.error("移除員工權限失敗 =", err);
      return res.status(500).json({ message: "移除員工權限失敗" });
    }
  },
);

module.exports = router;
