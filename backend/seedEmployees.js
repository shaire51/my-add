const mysql = require("mysql2");
const bcrypt = require("bcrypt");

const pool = mysql.createPool({
  host: "192.168.71.12",
  user: "tcadmin",
  password: "tcdb1234",
  database: "meetings",
  timezone: "+08:00",
});

// 👇 要匯入的員工資料
const employees = [{ emp_id: "41414", name: "王小明", password: "a9k99hj123" }];

async function seed() {
  try {
    for (const emp of employees) {
      const hash = await bcrypt.hash(emp.password, 10);

      await pool
        .promise()
        .query(
          "INSERT INTO employees (emp_id, name, password) VALUES (?, ?, ?)",
          [emp.emp_id, emp.name, hash]
        );

      console.log(`✅ 已新增員工 ${emp.emp_id}`);
    }
    console.log("🎉 全部匯入完成");
    process.exit();
  } catch (err) {
    console.error("❌ 匯入失敗", err);
    process.exit(1);
  }
}

seed();
