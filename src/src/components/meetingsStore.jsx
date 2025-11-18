// src/store/meetingsStore.js
import { createContext, useContext, useEffect, useMemo, useState } from "react";

// 工具：把 "HH:MM" 轉成分鐘
function hhmmToMin(t) {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]),
    mm = Number(m[2]);
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

// 工具：把 "HH:MM~HH:MM" 轉成 { startMin, endMin }；不合法回 null
function rangeToMin(range) {
  const m = range.match(/^\s*(\d{1,2}):(\d{2})\s*~\s*(\d{1,2}):(\d{2})\s*$/);
  if (!m) return null;
  const sh = Number(m[1]),
    sm = Number(m[2]);
  const eh = Number(m[3]),
    em = Number(m[4]);
  if (sh > 23 || sm > 59 || eh > 23 || em > 59) return null;
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (startMin >= endMin) return null;
  return { startMin, endMin };
}

// 種子資料（把原本 ppap 轉成統一結構）
const seedRaw = [];

function toSeedMeetings(list) {
  const ok = [];
  for (const it of list) {
    // 日期簡驗
    if (!/^\d{4}-\d{2}-\d{2}$/.test(it.date)) continue;
    const r = rangeToMin(it.time || "");
    if (!r) continue;
    ok.push({
      id: it.id,
      name: it.name,
      unit: it.unit,
      date: it.date,
      startMin: r.startMin,
      endMin: r.endMin,
      people: it.people,
      reporter: it.reporter ?? it.where ?? "",
      place: it.place,
      // 額外存一個顯示用字串
      timeLabel: it.time,
    });
  }
  return ok;
}

const OPEN = 8 * 60; // 08:00
const CLOSE = 18 * 60; // 18:00

function withinBusinessHours(startMin, endMin) {
  return startMin >= OPEN && endMin <= CLOSE;
}

function isOverlap(aStart, aEnd, bStart, bEnd) {
  // 有交集即算衝突：aStart < bEnd && aEnd > bStart
  return aStart < bEnd && aEnd > bStart;
}

const KEY = "meetings_v1";

const MeetingsCtx = createContext(null);

export function MeetingsProvider({ children }) {
  const [meetings, setMeetings] = useState(() => {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return toSeedMeetings(seedRaw);
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(meetings));
  }, [meetings]);

  const api = useMemo(() => {
    return {
      meetings,
      // 檢查同日同地點是否與現有時段衝突
      deleteMeeting(id) {
        setMeetings((prev) => prev.filter((m) => m.id !== id));
        return { ok: true };
      },
      hasConflict({ date, place, startMin, endMin }) {
        return meetings.some(
          (m) =>
            m.date === date &&
            m.place === place &&
            isOverlap(startMin, endMin, m.startMin, m.endMin)
        );
      },
      // 新增會議（回傳 { ok, error }）
      addMeeting(payload) {
        const {
          name,
          unit,
          date,
          start, // "HH:MM"
          end, // "HH:MM"
          people,
          reporter,
          place,
          attachments = [],
        } = payload;

        // 1) 解析時間
        const startMin = hhmmToMin(start);
        const endMin = hhmmToMin(end);
        if (startMin == null || endMin == null || startMin >= endMin) {
          return { ok: false, error: "時間格式錯誤或開始不早於結束" };
        }

        if (startMin % 5 !== 0 || endMin % 5 !== 0) {
          return {
            ok: false,
            error: "時間必須以 5 分鐘為單位（例如 09:00、09:05、09:10）",
          };
        }

        // 2) 營業時間限制
        if (!withinBusinessHours(startMin, endMin)) {
          return { ok: false, error: "僅能於 08:00–18:00 之內預約" };
        }

        // 3) 日期檢查
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return { ok: false, error: "日期格式錯誤，需為 YYYY-MM-DD" };
        }
        const dt = new Date(date);
        if (Number.isNaN(dt.getTime())) {
          return { ok: false, error: "日期無效" };
        }

        // 4) 衝突檢查（同日同地點重疊）
        if (
          meetings.some(
            (m) =>
              m.date === date &&
              m.place === place &&
              isOverlap(startMin, endMin, m.startMin, m.endMin)
          )
        ) {
          return { ok: false, error: "該地點在此時段已被預約（有重疊）" };
        }

        // 5) 生成新會議
        const id = Date.now();
        const timeLabel = `${start}~${end}`;

        const next = [
          ...meetings,
          {
            id,
            name,
            unit,
            date,
            startMin,
            endMin,
            timeLabel,
            people,
            reporter,
            place,
            attachments,
          },
        ];
        setMeetings(next);
        return { ok: true };
      },
      // 方便 Ppap 直接拿表格資料
      toRows() {
        const now = new Date();
        const today = now.toISOString().split("T")[0]; // YYYY-MM-DD
        const nowMin = now.getHours() * 60 + now.getMinutes();

        return [...meetings]
          .filter((m) => {
            if (m.date < today) return false;

            if (m.date === today && m.endMin <= nowMin) return false;

            return true;
          })
          .sort((a, b) =>
            a.date === b.date
              ? a.startMin - b.startMin
              : a.date.localeCompare(b.date)
          );
      },
    };
  }, [meetings]);

  return <MeetingsCtx.Provider value={api}>{children}</MeetingsCtx.Provider>;
}

export function useMeetings() {
  const ctx = useContext(MeetingsCtx);
  if (!ctx) throw new Error("useMeetings must be used within MeetingsProvider");
  return ctx;
}
