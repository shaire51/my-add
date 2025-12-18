// src/Page/Screen.jsx
import { useMemo } from "react";
import { useMeetings } from "../stores/meetingsStore.jsx";

function isFloorPlace(place, floor) {
  const p = String(place ?? "").trim();

  // 你 place 可能是：二樓會議室 / 2樓會議室 / 2F 會議室 / 五樓會議室 / 5F...
  if (floor === 2) return /(^|[^0-9])2(樓|f)|二樓/i.test(p);
  if (floor === 5) return /(^|[^0-9])5(樓|f)|五樓/i.test(p);
  return false;
}

export default function Screen({ floor }) {
  const store = useMeetings();
  const rows = store?.toRows ? store.toRows() : [];

  // ✅ 用 place 分樓層
  const floorMeetings = useMemo(() => {
    return rows.filter((m) => isFloorPlace(m.place, floor));
  }, [rows, floor]);

  // ✅ debug：你用投影頁一定要看得到這些 log
  console.log("[Screen] floor:", floor);
  console.log("[Screen] rows total:", rows.length);
  console.log("[Screen] sample place:", rows[0]?.place);
  console.log("[Screen] floorMeetings:", floorMeetings.length);

  return (
    <main style={{ padding: 24 }}>
      <h1>{floor === 2 ? "二樓會議室" : "五樓會議室"}</h1>

      <h2>排程</h2>
      {floorMeetings.length === 0 ? (
        <p>（此樓層目前沒有排程 / 或 place 不符合分樓層規則）</p>
      ) : (
        floorMeetings.map((m) => (
          <div key={m.id} style={{ marginBottom: 8 }}>
            {m.date} {m.start}~{m.end}｜{m.name}｜{m.place}
          </div>
        ))
      )}
    </main>
  );
}
