// src/components/Nav.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../stores/AuthContext.jsx";
import "../styles/Nav.css";

export default function Nav() {
  console.log("Nav 有進來");

  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  const isAdmin = user?.permissions?.includes("permission.assign.admin");
  const canSeeOthers =
    user?.permissions?.includes("option.other.view") || isAdmin;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    logout();
    navigate("/login");
  };

  console.log("Nav user =", user);
  console.log("Nav permissions =", user?.permissions);
  console.log("Nav isAdmin =", isAdmin);
  console.log("Nav canSeeOthers =", canSeeOthers);
  return (
    <nav className="nav">
      <div className="nav-left">
        <Link to="/">
          <img
            src={`${import.meta.env.BASE_URL}沙灘.jpg`}
            alt="logo"
            className="logo"
          />
        </Link>
      </div>

      <div className="nav-center">
        <Link to="/">會議排程</Link>
        <Link to="/reserve">會議預約</Link>
        <Link to="/admin">會議管理</Link>

        {isAdmin && <Link to="/permissions">權限管理</Link>}

        {canSeeOthers && (
          <div className="dropdown">
            <button className="dropdown-btn">其他</button>

            <div className="dropdown-menu">
              <a
                href="http://172.16.1.100/bms/elRegForm/externalInit#!"
                target="_blank"
                rel="noreferrer"
              >
                電子捐血登記表
              </a>

              <a
                href="http://192.168.71.12:90/itinerary/php/read.php"
                target="_blank"
                rel="noreferrer"
              >
                存放檔案
              </a>

              <a
                href="http://192.168.71.12:90/itinerary/barcode"
                target="_blank"
                rel="noreferrer"
              >
                條碼產生
              </a>

              <a
                href="http://192.168.71.12:90/build/Pdf"
                target="_blank"
                rel="noreferrer"
              >
                PDF壓縮(限一頁)
              </a>

              <a
                href="http://192.168.71.12:90/build/manyPdf"
                target="_blank"
                rel="noreferrer"
              >
                PDF壓縮(多頁)
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="nav-right">
        {user ? (
          <div
            className="nav-user-wrapper"
            onMouseEnter={() => setShowMenu(true)}
            onMouseLeave={() => setShowMenu(false)}
          >
            <span className="nav-user">您好，{user.name} ▾</span>

            {showMenu && (
              <div className="nav-dropdown">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    handleLogout();
                  }}
                >
                  登出
                </button>
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
