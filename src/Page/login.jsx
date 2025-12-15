import "../styles/login.css";

export default function Login() {
  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <main className="login-main">
      <section className="login-card">
        <h2 className="login-title">員工登入系統</h2>

        <form className="login-form" onSubmit={handleSubmit}>
          {/* 員工編號 */}
          <div className="login-field">
            <label htmlFor="empId" className="login-label">
              員工編號：
            </label>
            <input
              id="empId"
              type="text"
              className="login-input"
              placeholder="您的員工帳號"
              defaultValue=""
            />
          </div>

          {/* 員工密碼 */}
          <div className="login-field">
            <label htmlFor="empPassword" className="login-label">
              員工密碼：
            </label>
            <input
              id="empPassword"
              type="password"
              className="login-input"
              placeholder="您的BMS密碼"
            />
          </div>

          {/* 登入按鈕 */}
          <button type="submit" className="login-button">
            登入
          </button>
        </form>
      </section>
    </main>
  );
}
