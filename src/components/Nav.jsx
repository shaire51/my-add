// src/components/Nav.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../stores/AuthContext.jsx";
import "../styles/Nav.css";

export default function Nav() {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); //  AuthContext
    navigate("/login");
  };

  return (
    <nav className="nav">
      {/* 左側 Logo */}
      <div className="nav-left">
        <Link to="/">
          <img src="/沙灘.jpg" alt="logo" className="logo" />
        </Link>
      </div>

      {/* 中間選單 */}
      <div className="nav-center">
        <Link to="/">會議排程</Link>
        <Link to="/reserve">會議預約</Link>
        <Link to="/admin">會議編輯</Link>
      </div>

      {/* 右側登入區 */}
      <div className="nav-right">
        {user ? (
          <div
            className="nav-user-wrapper"
            onMouseEnter={() => setShowMenu(true)}
            onMouseLeave={() => setShowMenu(false)}
          >
            <span className="nav-user">歡迎回來，{user.name} ▾</span>

            {showMenu && (
              <div className="nav-dropdown">
                <button onClick={handleLogout}>登出</button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className="nav-login-btn">
            員工登入
          </Link>
        )}
      </div>
    </nav>
  );
}
