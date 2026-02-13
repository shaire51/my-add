// 匯入Hook
import { createContext, useContext, useEffect, useMemo, useState } from "react";

// 建立 Context 容器
const MeetingsCtx = createContext(null);

// 將user的時間字串轉成分鐘
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
  //如何顯示true則衝突
  return meetings.some((m) => {
    // 如果m.data 不等於 newM.data 則顯示false
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
  const API_BASE = "http://192.168.76.165:3001";
  const API = `${API_BASE}/api/meetings`;

  function authHeaders(extra = {}) {
    const token = localStorage.getItem("token");
    return {
      ...extra,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  const [meetings, setMeetings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("meetings_v1") || "[]");
    } catch {
      return [];
    }
  });
  const [now, setNow] = useState(() => new Date());
  const rooms = ["五樓會議室", "二樓會議室"];
  useEffect(() => {
    localStorage.setItem("meetings_v1", JSON.stringify(meetings));
  }, [meetings]);

  // 初始化 → 從後端載入全部會議

  async function reloadMeetings({ silent = false } = {}) {
    try {
      // 用「會議內容」當 key（延續你原本做法，保留 attachments）
      const makeKey = (m) =>
        `${m.date}|${m.start || m.start_time}|${m.end || m.end_time}|${m.place}|${m.name}`;

      const attachMap = new Map(
        meetings.map((m) => [makeKey(m), m.attachments || []]),
      );

      // ✅ 這行你漏掉了：真的去打 API
      const res = await fetch(API, { headers: authHeaders() });

      if (!res.ok) {
        if (!silent) {
          const text = await res.text().catch(() => "");
          console.error("reloadMeetings failed:", res.status, text);
        }
        return { ok: false, status: res.status };
      }

      const list = await res.json();

      const converted = (Array.isArray(list) ? list : []).map((it) => {
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
          attachments: attachMap.get(key) ?? [],
        };
      });

      setMeetings(converted);
      return { ok: true };
    } catch (err) {
      if (!silent) console.error("reloadMeetings error:", err);
      return { ok: false, error: err };
    }
  }
  useEffect(() => {
    reloadMeetings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const intervalMs = 10 * 1000;

    const timer = setInterval(() => {
      reloadMeetings({ silent: true });
    }, intervalMs);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 每 10 秒更新一次「現在時間」
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10 * 1000);
    return () => clearInterval(timer);
  }, []);

  function findConflicts(newM, meetings) {
    const ns = hhmmToMin(newM.start);
    const ne = hhmmToMin(newM.end);
    if (ns == null || ne == null || Number.isNaN(ns) || Number.isNaN(ne))
      return [];

    return meetings.filter((m) => {
      // 同一天
      if (m.date !== newM.date) return false;

      // 同地點（同一會議室才算衝突）
      if ((m.place || "").trim() !== (newM.place || "").trim()) return false;

      // 編輯時排除自己
      if (newM.id && String(m.id) === String(newM.id)) return false;

      const ms = hhmmToMin(m.start ?? m.start_time);
      const me = hhmmToMin(m.end ?? m.end_time);
      if (ms == null || me == null) return false;

      // 時段重疊判斷： [ns,ne) 與 [ms,me) overlap
      return ns < me && ms < ne;
    });
  }

  //  只檢查，不寫入
  function canAddMeeting(m) {
    const startDt = toDateTime(m.date, m.start);
    const endDt = toDateTime(m.date, m.end);
    const nowDt = new Date();
    const ns = hhmmToMin(m.start);
    const ne = hhmmToMin(m.end);
    if (endDt <= nowDt) {
      return { ok: false, message: "此時段已經過去，無法預約" };
    }
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
      const place = String(m.place ?? "").trim();

      const alternatives = rooms.filter((r) => r !== place);

      // ✅這行是關鍵：把衝突會議找出來
      const conflicts = findConflicts(m, meetings);

      return {
        ok: false,
        message: "此會議室在該時段已有會議，無法預約",
        alternatives,
        conflicts, // 或 conflicts: conflicts.slice(0, 3)
      };
    }
    return { ok: true };
  }

  function toUpcomingRows() {
    const nowDt = new Date();

    // ✅ 只顯示「未來 7 天內」(含今天)
    const until = new Date(nowDt.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcoming = meetings.filter((m) => {
      const startDt = toDateTime(m.date, m.start);
      const endDt = toDateTime(m.date, m.end);

      // 仍未結束
      if (endDt <= nowDt) return false;

      // 在未來 7 天內（用開始時間判斷）
      if (startDt > until) return false;

      return true;
    });

    return upcoming.sort((a, b) =>
      a.date === b.date
        ? a.start.localeCompare(b.start)
        : a.date.localeCompare(b.date),
    );
  }
  //過濾版會議編輯
  function toNotStartedRows() {
    const nowDt = new Date();

    const list = meetings.filter((m) => {
      if (!m.date || !m.end) return false; // 需要 end
      const endDt = toDateTime(m.date, m.end);
      return endDt > nowDt; //  還沒結束就顯示（結束才消失）
    });

    return list.sort((a, b) =>
      a.date === b.date
        ? a.start.localeCompare(b.start)
        : a.date.localeCompare(b.date),
    );
  }

  // 新增會議（加入前端 store）
  async function addMeeting(m) {
    const check = canAddMeeting(m);
    if (!check.ok) return check;

    const token = localStorage.getItem("token");
    if (!token) return { ok: false, message: "未登入" };

    try {
      const payload = {
        name: m.name,
        unit: m.unit,
        date: m.date,
        start_time: m.start,
        end_time: m.end,
        people: m.people,
        reporter: m.reporter,
        place: m.place,
      };

      const res = await fetch(API, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, message: data.message || "新增失敗" };

      // 後端回傳 insertId
      const full = {
        ...m,
        id: data.id, // ✅ 用後端的 id
        startMin: hhmmToMin(m.start),
        endMin: hhmmToMin(m.end),
        timeLabel: `${m.start}~${m.end}`,
      };

      setMeetings((prev) => [...prev, full]);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: "無法連線到伺服器" };
    }
  }

  async function deleteMeeting(id) {
    const token = localStorage.getItem("token");
    if (!token) return { ok: false, message: "未登入" };

    try {
      const res = await fetch(`${API}/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { ok: false, message: data.message || "刪除失敗" };
      }

      setMeetings((prev) => prev.filter((m) => m.id !== id));
      return { ok: true };
    } catch (err) {
      return { ok: false, message: "無法連線到伺服器" };
    }
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
    const EARLY_MIN = 15;
    const EARLY_MS = EARLY_MIN * 60 * 1000;

    const active = meetings.filter((m) => {
      if (!m.date || !m.start || !m.end) return false;

      const startDt = toDateTime(m.date, m.start);
      const endDt = toDateTime(m.date, m.end);

      //  開始前 15 分鐘就算要顯示在上面大卡
      const showFrom = new Date(startDt.getTime() - EARLY_MS);

      return now >= showFrom && now < endDt;
    });

    return active.sort((a, b) =>
      a.date === b.date
        ? a.start.localeCompare(b.start)
        : a.date.localeCompare(b.date),
    );
  }

  async function updateMeeting(updated) {
    const token = localStorage.getItem("token");
    if (!token) return { ok: false, message: "未登入" };

    try {
      const payload = {
        name: updated.name,
        unit: updated.unit,
        date: updated.date,
        start_time: updated.start,
        end_time: updated.end,
        people: updated.people,
        reporter: updated.reporter,
        place: updated.place,
      };

      const res = await fetch(`${API}/${updated.id}`, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, message: data.message || "更新失敗" };

      // 後端成功後才更新前端
      setMeetings((prev) =>
        prev.map((m) => {
          if (m.id !== updated.id) return m;

          const start = updated.start ?? m.start;
          const end = updated.end ?? m.end;

          return {
            ...m,
            ...updated,
            start,
            end,
            startMin: hhmmToMin(start),
            endMin: hhmmToMin(end),
            timeLabel: `${start}~${end}`,
          };
        }),
      );

      return { ok: true };
    } catch (err) {
      return { ok: false, message: "無法連線到伺服器" };
    }
  }

  //body.jsx
  function isFloorPlace(place, floor) {
    const p = String(place ?? "").trim();
    if (floor === 2) return /二樓|2樓|2f/i.test(p);
    if (floor === 5) return /五樓|5樓|5f/i.test(p);
    return true;
  }

  //星期幾
  function weekdayZh(dateStr) {
    if (!dateStr) return "";
    const d = new Date(`${dateStr}T00:00:00`); // 避免時區解析偏一天
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("zh-TW", { weekday: "short" }); // 例：週三
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
      updateMeeting,
      weekdayZh,
      toNotStartedRows,
      rooms,
    }),
    [meetings, now],
  );

  return <MeetingsCtx.Provider value={api}>{children}</MeetingsCtx.Provider>;
}

export function useMeetings() {
  return useContext(MeetingsCtx);
}
