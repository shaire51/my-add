// src/components/Body.jsx
import "./Body.css";
import { useMeetings } from "./meetingsStore.jsx";

export default function Body() {
  // 從 store 拿會議資料
  const { toRows } = useMeetings();
  const rows = toRows();
  const main = rows[0] || null; // 上面大卡顯示第一筆

  const attachment = main?.attachments?.[0] || null;
  const isImage = attachment?.type?.startsWith("image/");
  const downloadHref = attachment?.dataUrl || "#";

  return (
    <main className="main">
      {/* ===== 上面大卡 ===== */}
      <section className="hero">
        <div className="hero-image">
          {isImage && (
            <img
              src={attachment.dataUrl}
              alt={attachment.name}
              className="hero-img"
            />
          )}
        </div>

        <div className="hero-info">
          <h2 className="hero-title">
            會議名稱：
            <span>{main ? main.name : "目前尚無會議"}</span>
          </h2>

          <div className="hero-row">
            <dt>日期：</dt>
            <dd>{main ? `${main.date} ${main.timeLabel}` : "—"}</dd>
          </div>

          <div className="hero-detail">
            <div className="hero-color">
              <dt>主辦單位：</dt>
              <dd>{main?.unit || "—"}</dd>
            </div>
            <div className="hero-color">
              <dt>提報人：</dt>
              <dd>{main?.reporter || "—"}</dd>
            </div>
            <div className="hero-color">
              <dt>地點：</dt>
              <dd>{main?.place || "—"}</dd>
            </div>
            <div className="hero-row">
              <dt>參與人員：</dt>
              <dd>{main?.people || "—"}</dd>
            </div>
          </div>

          {attachment ? (
            <a
              href={downloadHref}
              download={attachment.name}
              className="primary-btn download-link"
            >
              檔案下載
            </a>
          ) : (
            <button className="primary-btn" disabled>
              無附件可下載
            </button>
          )}
        </div>
      </section>

      {/* ===== 下面「會議排程」列表 ===== */}
      <section className="schedule">
        <h3 className="schedule-title">會議排程</h3>

        <div className="schedule-list">
          {rows.length === 0 ? (
            <p className="schedule-empty">目前尚未有任何會議預約。</p>
          ) : (
            rows.map((m) => (
              <article className="schedule-card" key={m.id}>
                <h4 className="schedule-card-title">{m.name}</h4>
                <p className="schedule-line">主辦單位：{m.unit}</p>
                <p className="schedule-line">提報人：{m.reporter}</p>
                <p className="schedule-line">
                  日期：{m.date} {m.timeLabel}
                </p>
                <p className="schedule-line">地點：{m.place}</p>
                <p className="schedule-line">參與人員：{m.people}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
