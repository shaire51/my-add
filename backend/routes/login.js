const express = require("express");
const ldap = require("ldapjs");
const jwt = require("jsonwebtoken");

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
        timeLimit: 5, //  LDAP server 端搜尋限制（秒）
        paged: false,
      },
      (err, res) => {
        if (err) return reject(err);

        res.on("searchEntry", (e) => {
          if (!found) found = e;
        });

        //  如果 server 回傳 searchReference 也不要當成 entry
        res.on("searchReference", () => {});

        res.on("error", (e) => reject(e));
        res.on("end", (r) => {
          // r?.status === 0 表示成功結束
          resolve(found);
        });
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

  // ✅ 避免 ldapjs event 未處理造成 process 噴掉
  client.on("error", () => {});

  try {
    // 1) 先用 SVC 帳號 bind（查詢用）
    await ldapBind(client, SVC_BIND, SVC_PW);

    // 2) 用 sAMAccountName 找使用者
    const safeEmpId = escapeLdapFilterValue(empId);
    const entry = await ldapSearchOne(
      client,
      BASE_DN,
      `(sAMAccountName=${safeEmpId})`,
    );
    if (!entry) return res.status(401).json({ message: "帳號不存在" });

    // 有些 ldapjs 版本可以從 entry.object 直接拿 DN
    const userDN =
      getAttr(entry, "distinguishedName") ||
      entry?.object?.distinguishedName ||
      entry?.dn?.toString?.() ||
      "";

    if (!userDN) {
      return res.status(500).json({ message: "找不到 distinguishedName" });
    }

    // 3) 用使用者 DN + 密碼 bind（驗密碼）
    await ldapBind(client, userDN, password);

    // 4) 驗證成功：回傳 user + token
    // ✅ JWT 建議只放「必要」資訊，避免塞太多內部欄位
    const user = {
      empId: getAttr(entry, "sAMAccountName") || empId,
      name: getAttr(entry, "displayName"),
      email: getAttr(entry, "mail"),
      dept: getAttr(entry, "department"),
      upn: getAttr(entry, "userPrincipalName"),
    };

    // ✅ 建議用 subject (sub) 放唯一值，payload 不要太大
    const token = jwt.sign(
      { name: user.name, email: user.email, dept: user.dept },
      process.env.JWT_SECRET,
      { expiresIn: "8h", subject: user.empId },
    );

    return res.json({ message: "登入成功", user, token });
  } catch (err) {
    // ✅ ldapjs 常見：err.name / err.code / err.lde_message
    const name = String(err?.name || "");
    const code = String(err?.code || "");
    const msg = String(err?.message || "");
    const ldapMsg = String(err?.lde_message || "");

    const badPw =
      name === "InvalidCredentialsError" ||
      code === "49" || // AD 常見 invalid credentials
      msg.includes("InvalidCredentials") ||
      ldapMsg.includes("data 52e"); // AD 常見：52e = 密碼錯

    return res
      .status(401)
      .json({ message: badPw ? "密碼錯誤" : "LDAP 登入失敗" });
  } finally {
    // ✅ unbind 是 async callback，保守做法用 destroy 避免卡住
    try {
      client.unbind();
    } catch {}
    try {
      client.destroy();
    } catch {}
  }
});

module.exports = router;
