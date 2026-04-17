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

  // 同時拿：正在進行(active) + 全部排程(all)
  const { toActiveRows, toUpcomingRows, weekdayZh } = useMeetings();

  const activeRowsAll = toActiveRows(); // 全部正在進行（不分樓層）
  const allRows = toUpcomingRows(); // 下面排程：維持全部（混合）

  // 大卡：有傳 previewFloor 就只取該樓層正在進行的會議
  const activeRows = previewFloor
    ? activeRowsAll.filter((m) => isFloorPlace(m.place, previewFloor))
    : activeRowsAll;

  const main = activeRows[0] || null;
  const attachment = main?.attachments?.[0] || null;
  const isImage = attachment?.type?.startsWith("image/");
  const hasImage = Boolean(isImage && (attachment?.url || attachment?.dataUrl));
  console.log("previewFloor =", previewFloor);
  console.log("main =", main);
  console.log("main.attachments =", main?.attachments);
  return (
    <main className="main">
      <section className={`hero ${!hasImage ? "no-image" : ""}`}>
        {hasImage && (
          <div className="hero-image">
            <img
              src={attachment.url || attachment.dataUrl}
              alt={attachment.name}
              className="hero-img"
            />
          </div>
        )}

        <div className="hero-info">
          <h2 className="hero-title">
            會議名稱：<span>{main ? main.name : "目前尚無會議"}</span>
          </h2>

          <div className="hero-row">
            <dd>
              {main ? (
                <>
                  日期：{main.date}（{weekdayZh(main.date)}）
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
            <div className="hero-color">
              <dt>是否視訊：</dt>
              <dd>{main ? (main.isVideo ? "是" : "否") : "_"}</dd>
            </div>
            <div className="hero-row">
              <dt>參與單位：</dt>
              <dd>{main?.people || "—"}</dd>
            </div>
            <div className="hero-row">
              <dt>參與人數：</dt>
              <dd>{main?.participantCount ?? "—"}</dd>
            </div>
          </div>
        </div>
      </section>

      <section className="schedule">
        <h3 className="schedule-title">會議排程（近７天會議）</h3>

        <div className="schedule-list">
          {allRows.length === 0 ? (
            <p className="schedule-empty">目前尚未有任何會議預約。</p>
          ) : (
            allRows.map((m) => (
              <article className="schedule-card" key={m.id}>
                <div className="schedule-info">
                  <h4 className="schedule-card-title">會議名稱：{m.name}</h4>
                  <p className="schedule-line">主辦單位：{m.unit}</p>
                  <p className="schedule-line">
                    日期：{m.date}({weekdayZh(m.date)})
                  </p>
                  <p className="schedule-line">時間：{m.timeLabel}</p>
                  <p className="schedule-line">提報人：{m.reporter}</p>
                  <p className="schedule-line">地點：{m.place}</p>
                  <p className="schedule-line">
                    視訊：{(m.isVideo ?? !!m.is_video) ? "是" : "否"}
                  </p>
                  <p className="schedule-line">參與單位：{m.people}</p>
                  <p className="schedule-line">
                    參與人數：{m.participantCount}
                  </p>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
