const mysql = require("mysql2");

const pool = mysql
  .createPool({
    host: "192.168.71.12",
    port: 3306,
    user: "tcadmin",
    password: "tcdb1234",
    database: "meetings",
    timezone: "+08:00",
  })
  .promise(); //  關鍵就在這行

// 測試連線
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log(" 資料庫連線成功");
    connection.release();
  } catch (err) {
    console.error(" 資料庫連線失敗：", err);
  }
})();

module.exports = pool;
