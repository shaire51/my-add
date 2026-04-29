// src/components/Foot.jsx
import "../styles/Foot.css";
import "../styles/Foot.css";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function Foot() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <span>會議系統預約</span>
        <div className="footer-links">
          <a href={`${API_BASE}/uploads/manuals/meeting-manual.pdf`} download>
            操作手冊下載
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 資訊課 敬上</span>
        <div className="footer-icons">
          <span>無法使用請聯絡資訊課：張文川 #4553</span>
        </div>
      </div>
      <img src={`${import.meta.env.BASE_URL}粉紅三角色塊.png`} />
    </footer>
  );
}
