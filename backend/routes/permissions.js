const express = require("express");
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");
const requirePermission = require("../middleware/requirePermission");
const ldap = require("ldapjs");
const router = express.Router();
const LDAP_URL = process.env.LDAP_URL;
const BASE_DN = process.env.LDAP_BASE_DN;
const SVC_BIND = process.env.LDAP_SVC_BIND;
const SVC_PW = process.env.LDAP_SVC_PASSWORD;
// 查某員工目前權限
router.get(
  "/user/:empId",
  requireAuth,
  requirePermission("permission.assign.admin"),
  async (req, res) => {
    try {
      const { empId } = req.params;
      const employee = await findOrCreateEmployeeByEmpId(empId);

      if (!employee) {
        return res.status(404).json({ message: "找不到該員工" });
      }

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
  requirePermission("permission.assign.admin"),
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
      const adminLevelPermissions = ["permission.assign.admin"];

      if (
        adminLevelPermissions.includes(permissionCode) &&
        !req.user.permissions?.includes("permission.assign.admin")
      ) {
        return res.status(403).json({ message: "沒有賦予管理權限的資格" });
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
  requirePermission("permission.assign.admin"),
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

function getAttr(entry, name) {
  const a = entry?.attributes?.find((x) => x.type === name);
  return a?.values?.[0] ?? a?.vals?.[0] ?? "";
}

function escapeLdapFilterValue(v = "") {
  return String(v).replace(/[\\()*\0]/g, (ch) => {
    switch (ch) {
      case "\\":
        return "\\5c";
      case "*":
        return "\\2a";
      case "(":
        return "\\28";
      case ")":
        return "\\29";
      case "\0":
        return "\\00";
      default:
        return ch;
    }
  });
}

function ldapBind(client, dn, pw) {
  return new Promise((resolve, reject) => {
    client.bind(dn, pw, (err) => (err ? reject(err) : resolve()));
  });
}

function ldapSearchOne(client, baseDN, filter) {
  return new Promise((resolve, reject) => {
    let found = null;

    client.search(
      baseDN,
      {
        scope: "sub",
        filter,
        attributes: [
          "distinguishedName",
          "displayName",
          "mail",
          "department",
          "sAMAccountName",
          "userPrincipalName",
        ],
        sizeLimit: 1,
        timeLimit: 5,
        paged: false,
      },
      (err, res) => {
        if (err) return reject(err);

        res.on("searchEntry", (e) => {
          if (!found) found = e;
        });

        res.on("searchReference", () => {});
        res.on("error", (e) => reject(e));
        res.on("end", () => resolve(found));
      },
    );
  });
}

async function findOrCreateEmployeeByEmpId(empId) {
  const [empRows] = await pool.query(
    "SELECT id, emp_id, name FROM employees WHERE emp_id = ? LIMIT 1",
    [empId],
  );

  if (empRows.length) {
    return empRows[0];
  }

  const client = ldap.createClient({
    url: LDAP_URL,
    timeout: 5000,
    connectTimeout: 5000,
    reconnect: false,
  });

  client.on("error", () => {});

  try {
    await ldapBind(client, SVC_BIND, SVC_PW);

    const safeEmpId = escapeLdapFilterValue(empId);
    const entry = await ldapSearchOne(
      client,
      BASE_DN,
      `(sAMAccountName=${safeEmpId})`,
    );

    if (!entry) {
      return null;
    }

    const ldapUser = {
      empId: getAttr(entry, "sAMAccountName") || empId,
      name: getAttr(entry, "displayName") || empId,
    };

    const [insertResult] = await pool.query(
      `INSERT INTO employees (emp_id, password, name, role)
       VALUES (?, '', ?, 'user')`,
      [ldapUser.empId, ldapUser.name],
    );

    return {
      id: insertResult.insertId,
      emp_id: ldapUser.empId,
      name: ldapUser.name,
    };
  } finally {
    try {
      client.unbind();
    } catch {}
    try {
      client.destroy();
    } catch {}
  }
}

module.exports = router;
