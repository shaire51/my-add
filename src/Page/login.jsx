import "../styles/login.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../stores/AuthContext.jsx";

export default function Login() {
  const [empId, setEmpId] = useState("");
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:3001/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ empId, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "登入失敗");
        return;
      }

      login(data.user);
      navigate("/reserve");
    } catch (err) {
      setError("無法連線到伺服器");
    }
  };

  return (
    <main className="login-main">
      <section className="login-card">
        <h2 className="login-title">員工登入系統</h2>

        <form className="login-form" onSubmit={handleSubmit}>
          {/* 員工編號 */}
          <div className="login-field">
            <label className="login-label">員工編號</label>
            <input
              className="login-input"
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              placeholder="員工編號"
            />
          </div>

          {/* 密碼 */}
          <div className="login-field">
            <label className="login-label">密碼</label>
            <input
              type="password"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密碼"
            />
          </div>

          {/* 錯誤訊息 */}
          {error && <p style={{ color: "red" }}>{error}</p>}

          <button type="submit" className="login-button">
            登入
          </button>
        </form>
      </section>
    </main>
  );
}
