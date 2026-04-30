const express = require("express");
const ldap = require("ldapjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

const LDAP_URL = process.env.LDAP_URL;
const BASE_DN = process.env.LDAP_BASE_DN;
const SVC_BIND = process.env.LDAP_SVC_BIND;
const SVC_PW = process.env.LDAP_SVC_PASSWORD;

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

// POST /api/login
router.post("/", async (req, res) => {
  const { empId, password } = req.body || {};

  if (!empId || !password) {
    return res.status(400).json({ message: "缺少帳號或密碼" });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: "JWT_SECRET 未設定" });
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
      return res.status(401).json({ message: "帳號不存在" });
    }

    const userDN =
      getAttr(entry, "distinguishedName") ||
      entry?.object?.distinguishedName ||
      entry?.dn?.toString?.() ||
      "";

    if (!userDN) {
      return res.status(500).json({ message: "找不到 distinguishedName" });
    }

    await ldapBind(client, userDN, password);

    const ldapUser = {
      empId: getAttr(entry, "sAMAccountName") || empId,
      name: getAttr(entry, "displayName"),
      email: getAttr(entry, "mail"),
      dept: getAttr(entry, "department"),
      upn: getAttr(entry, "userPrincipalName"),
    };
    console.log("ldapUser =", ldapUser);

    const [empRows] = await pool.query(
      `SELECT id, emp_id, name, role, created_at
       FROM employees
       WHERE emp_id = ?
       LIMIT 1`,
      [ldapUser.empId],
    );
    console.log("empRows =", empRows);

    let employeeId;

    if (!empRows.length) {
      const [insertResult] = await pool.query(
        `INSERT INTO employees (emp_id, password, name, role)
         VALUES (?, '', ?, 'user')`,
        [ldapUser.empId, ldapUser.name || ldapUser.empId],
      );
      employeeId = insertResult.insertId;
    } else {
      employeeId = empRows[0].id;
    }
    console.log("employeeId =", employeeId);

    const [permissionRows] = await pool.query(
      `SELECT p.code
       FROM employee_permissions ep
       INNER JOIN permissions p ON p.id = ep.permission_id
       WHERE ep.employee_id = ?`,
      [employeeId],
    );
    console.log("permissionRows =", permissionRows);

    const permissions = [
      ...new Set(permissionRows.map((r) => r.code).filter(Boolean)),
    ];
    console.log("permissions =", permissions);

    const user = {
      empId: ldapUser.empId,
      name: ldapUser.name,
      email: ldapUser.email,
      dept: ldapUser.dept,
      upn: ldapUser.upn,
      permissions,
    };
    console.log("user =", user);

    const token = jwt.sign(
      {
        name: user.name,
        email: user.email,
        dept: user.dept,
        permissions: user.permissions,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h", subject: user.empId },
    );

    return res.json({
      message: "登入成功",
      user,
      token,
    });
  } catch (err) {
    console.error("login error =", err);

    const name = String(err?.name || "");
    const code = String(err?.code || "");
    const msg = String(err?.message || "");
    const ldapMsg = String(err?.lde_message || "");

    const badPw =
      name === "InvalidCredentialsError" ||
      code === "49" ||
      msg.includes("InvalidCredentials") ||
      ldapMsg.includes("data 52e");

    return res
      .status(401)
      .json({ message: badPw ? "密碼錯誤" : "LDAP 登入失敗" });
  } finally {
    try {
      client.unbind();
    } catch {}
    try {
      client.destroy();
    } catch {}
  }
});

module.exports = router;
