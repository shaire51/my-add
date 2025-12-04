// src/components/Nav.jsx
import { Link } from "react-router-dom";
import "./Nav.css";

export default function Nav() {
  return (
    <nav className="nav">
      <div className="nav-left">
        <Link to="/">
          <img src="/沙灘.jpg" alt="logo" className="logo" />
        </Link>
      </div>

      <div className="nav-center">
        <Link to="/">會議排程</Link>
        <Link to="/reserve">會議預約</Link>
        <Link to="/admin">會議編輯</Link>
      </div>

      <div className="nav-right">
        <Link to="/login" className="nav-login-btn">
          員工登入
        </Link>
      </div>
    </nav>
  );
}
