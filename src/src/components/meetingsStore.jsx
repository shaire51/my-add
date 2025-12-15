import { createContext, useContext, useEffect, useMemo, useState } from "react";

const MeetingsCtx = createContext(null);

// 時間字串 → 分鐘
function hhmmToMin(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function MeetingsProvider({ children }) {
  const [meetings, setMeetings] = useState([]);

  // ⭐ ① 初始化 → 從後端載入全部會議
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("http://localhost:3001/api/meetings");
        const list = await res.json();

        const converted = list.map((it) => ({
          id: it.id,
          name: it.name,
          unit: it.unit,
          date: it.date,
          start: it.start_time,
          end: it.end_time,
          startMin: hhmmToMin(it.start_time),
          endMin: hhmmToMin(it.end_time),
          timeLabel: `${it.start_time}~${it.end_time}`,
          people: it.people,
          reporter: it.reporter,
          place: it.place,
          attachments: [],
        }));

        setMeetings(converted);
      } catch (err) {
        console.error("❌ 後端載入失敗：", err);
      }
    }

    load();
  }, []);

  // ⭐ ② 新增會議（後端已新增成功） → 加入前端
  function addMeeting(m) {
    const full = {
      ...m,
      startMin: hhmmToMin(m.start),
      endMin: hhmmToMin(m.end),
      timeLabel: `${m.start}~${m.end}`,
    };
    setMeetings((prev) => [...prev, full]);
    return { ok: true };
  }

  // ⭐ ③ 刪除會議（前端同步刪除）
  function deleteMeeting(id) {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    return { ok: true };
  }

  // ⭐ ④ Admin 與 Body 用的排序列表
  function toRows() {
    return [...meetings].sort((a, b) =>
      a.date === b.date
        ? a.start.localeCompare(b.start)
        : a.date.localeCompare(b.date)
    );
  }

  const api = useMemo(
    () => ({ meetings, addMeeting, deleteMeeting, toRows }),
    [meetings]
  );

  return <MeetingsCtx.Provider value={api}>{children}</MeetingsCtx.Provider>;
}

export function useMeetings() {
  return useContext(MeetingsCtx);
}
