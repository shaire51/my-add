// src/components/Body.jsx
import "../styles/Body.css";
import { useMeetings } from "../stores/meetingsStore.jsx";

export default function Body({ previewFloor = null }) {
  function isFloorPlace(place, floor) {
    const p = String(place ?? "").trim();
    if (floor === 2) return /二樓|2樓|2f/i.test(p);
    if (floor === 5) return /五樓|5樓|5f/i.test(p);
    return true;
  }
  // ✅ 同時拿：正在進行(active) + 全部排程(all)
  const { toActiveRows, toUpcomingRows } = useMeetings();

  const activeRowsAll = toActiveRows(); // 全部正在進行（不分樓層）
  const allRows = toUpcomingRows(); // ✅ 下面排程：維持全部（混合）

  // ⭐ 大卡：有傳 previewFloor 就只取該樓層正在進行的會議
  const activeRows = previewFloor
    ? activeRowsAll.filter((m) => isFloorPlace(m.place, previewFloor))
    : activeRowsAll;

  const main = activeRows[0] || null;

  const attachment = main?.attachments?.[0] || null;
  const isImage = attachment?.type?.startsWith("image/");
  const downloadHref = attachment?.dataUrl || "#";

  return (
    <main className="main">
      {/* ===== 上面大卡（時間到才出現） ===== */}
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
            <dd>
              {main ? (
                <>
                  日期：{main.date}
                  <br />
                  時間：{main.timeLabel}
                </>
              ) : (
                "—"
              )}
            </dd>
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
        </div>
      </section>

      {/* ===== 下面「會議排程」列表（顯示全部） ===== */}
      <section className="schedule">
        <h3 className="schedule-title">會議排程</h3>

        <div className="schedule-list">
          {allRows.length === 0 ? (
            <p className="schedule-empty">目前尚未有任何會議預約。</p>
          ) : (
            allRows.map((m) => (
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
