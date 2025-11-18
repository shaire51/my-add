// src/components/Nav.jsx
import { Link } from "react-router-dom";
import "./Nav.css";

export default function Nav() {
  return (
    <nav className="nav">
      <div className="nav-left">LOGO</div>
      <div className="nav-center">
        <Link to="/">會議排程</Link>
        <Link to="/reserve">會議預約</Link>
        <Link to="/admin">會議編輯</Link>
      </div>
      <div className="nav-right">
        <button className="nav-login-btn">員工登入</button>
      </div>
    </nav>
  );
}
