import { createContext, useContext, useEffect, useMemo, useState } from "react";

const MeetingsCtx = createContext(null);

// 時間字串 → 分鐘
function hhmmToMin(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// 組合 date + hh:mm 成為同一天的 Date
function toDateTime(dateStr, hhmm) {
  return new Date(`${dateStr}T${hhmm}:00`);
}

function hasConflict(newM, meetings) {
  const ns = hhmmToMin(newM.start);
  const ne = hhmmToMin(newM.end);
  if (ns == null || ne == null || Number.isNaN(ns) || Number.isNaN(ne))
    return false;

  return meetings.some((m) => {
    // 同一天
    if (m.date !== newM.date) return false;

    // 同地點
    if ((m.place || "") !== (newM.place || "")) return false;

    // 編輯時排除自己
    if (newM.id && m.id === newM.id) return false;

    const os = m.startMin ?? hhmmToMin(m.start);
    const oe = m.endMin ?? hhmmToMin(m.end);

    // 區間相交：ns < oe && ne > os
    return ns < oe && ne > os;
  });
}

export function MeetingsProvider({ children }) {
  const [meetings, setMeetings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("meetings_v1") || "[]");
    } catch {
      return [];
    }
  });
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    localStorage.setItem("meetings_v1", JSON.stringify(meetings));
  }, [meetings]);

  // 初始化 → 從後端載入全部會議
  useEffect(() => {
    async function load() {
      try {
        const local = meetings;

        // 用「會議內容」當 key（因為後端 id 可能跟你本機 id 不同）
        const makeKey = (m) =>
          `${m.date}|${m.start || m.start_time}|${m.end || m.end_time}|${
            m.place
          }|${m.name}`;

        const attachMap = new Map(
          local.map((m) => [makeKey(m), m.attachments || []])
        );

        // 2) 從後端載入
        const res = await fetch("http://localhost:3001/api/meetings");
        const list = await res.json();

        // 3) 轉換 + 把 attachments 接回來
        const converted = list.map((it) => {
          const key = `${it.date}|${it.start_time}|${it.end_time}|${it.place}|${it.name}`;
          return {
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

            // ✅ 不要再清空，改成從 localStorage 對回來
            attachments: attachMap.get(key) ?? [],
          };
        });

        setMeetings(converted);
      } catch (err) {
        console.error("❌ 後端載入失敗：", err);
      }
    }

    load();
  }, []);

  // 每 10 秒更新一次「現在時間」
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10 * 1000);
    return () => clearInterval(timer);
  }, []);

  // ✅ 只檢查，不寫入
  function canAddMeeting(m) {
    const startDt = toDateTime(m.date, m.start);
    const endDt = toDateTime(m.date, m.end);
    const nowDt = new Date();
    const ns = hhmmToMin(m.start);
    const ne = hhmmToMin(m.end);
    if (endDt <= nowDt) {
      return { ok: false, message: "此時段已經過去，無法預約" };
    }
    // 如果你想更嚴格：開始時間已過也不行（就算尚未結束）
    if (startDt <= nowDt) {
      return { ok: false, message: "開始時間已過，無法預約" };
    }
    if (ns == null || ne == null || Number.isNaN(ns) || Number.isNaN(ne)) {
      return { ok: false, message: "時間格式錯誤" };
    }
    if (ne <= ns) {
      return { ok: false, message: "結束時間必須晚於開始時間" };
    }
    if (hasConflict(m, meetings)) {
      return { ok: false, message: "此會議室在該時段已有會議，無法預約" };
    }
    return { ok: true };
  }

  function toUpcomingRows() {
    const nowDt = new Date();
    const upcoming = meetings.filter((m) => {
      const endDt = toDateTime(m.date, m.end);
      return endDt > nowDt; // 還沒結束才顯示
    });

    return upcoming.sort((a, b) =>
      a.date === b.date
        ? a.start.localeCompare(b.start)
        : a.date.localeCompare(b.date)
    );
  }
  // 新增會議（加入前端 store）
  function addMeeting(m) {
    const check = canAddMeeting(m);
    if (!check.ok) return check;

    const full = {
      ...m,
      startMin: hhmmToMin(m.start),
      endMin: hhmmToMin(m.end),
      timeLabel: `${m.start}~${m.end}`,
    };

    setMeetings((prev) => [...prev, full]);
    return { ok: true };
  }

  // 刪除會議（前端同步刪除）admin
  function deleteMeeting(id) {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    return { ok: true };
  }

  // 排序列表 admin
  function toRows() {
    const sorted = [...meetings].sort((a, b) => {
      if (a.date === b.date) {
        return a.start.localeCompare(b.start);
      }
      return a.date.localeCompare(b.date);
    });

    return sorted;
  }

  // 只回傳「正在進行中」
  function toActiveRows() {
    const active = meetings.filter((m) => {
      if (!m.date || !m.start || !m.end) return false;
      const startDt = toDateTime(m.date, m.start);
      const endDt = toDateTime(m.date, m.end);
      return now >= startDt && now < endDt;
    });

    return active.sort((a, b) =>
      a.date === b.date
        ? a.start.localeCompare(b.start)
        : a.date.localeCompare(b.date)
    );
  }
  //body.jsx
  function isFloorPlace(place, floor) {
    const p = String(place ?? "").trim();
    if (floor === 2) return /二樓|2樓|2f/i.test(p);
    if (floor === 5) return /五樓|5樓|5f/i.test(p);
    return true;
  }

  const api = useMemo(
    () => ({
      meetings,
      now,
      canAddMeeting,
      addMeeting,
      deleteMeeting,
      toRows,
      toActiveRows,
      toUpcomingRows,
      isFloorPlace,
    }),
    [meetings, now]
  );

  return <MeetingsCtx.Provider value={api}>{children}</MeetingsCtx.Provider>;
}

export function useMeetings() {
  return useContext(MeetingsCtx);
}
