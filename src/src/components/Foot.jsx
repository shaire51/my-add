// src/components/Foot.jsx
import "./Foot.css";

export default function Foot() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <span>會議系統預約</span>
        <div className="footer-links">
          <span>使用手冊下載</span>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 資訊課 敬上</span>
        <div className="footer-icons">
          <span>無法使用請聯絡資訊課：張文川 #4553</span>
        </div>
      </div>
    </footer>
  );
}
