import "../styles/login.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../stores/AuthContext.jsx";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function Login() {
  const [empId, setEmpId] = useState("");
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:3001/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          <div className="login-field">
            <label className="login-label">員工編號</label>
            <input
              className="login-input"
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              placeholder="員工編號"
            />
          </div>

          <div className="login-field">
            <label className="login-label">密碼</label>

            <div className="pw-input-wrap">
              <input
                type={showPw ? "text" : "password"}
                className="login-input pw-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密碼"
              />

              <button
                type="button"
                className="pw-icon-btn"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "隱藏密碼" : "顯示密碼"}
                title={showPw ? "隱藏" : "顯示"}
              >
                {showPw ? <FiEye /> : <FiEyeOff />}
              </button>
            </div>
          </div>

          {error && <p style={{ color: "red" }}>{error}</p>}

          <button type="submit" className="login-button">
            登入
          </button>
        </form>
      </section>
    </main>
  );
}
