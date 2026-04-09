import { useMemo, useState } from "react";

import { useMeetings } from "../stores/meetingsStore.jsx";
import "../styles/admin.css";
import { useNavigate } from "react-router-dom";
const API_BASE = "http://192.168.76.165:3001";
const API = `${API_BASE}/api/meetings`;

export default function Admin() {
  const { toNotStartedRows, deleteMeeting } = useMeetings();
  const baseRows = toNotStartedRows();
  const navigate = useNavigate();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [place, setPlace] = useState("all");
  const [q, setQ] = useState("");
  const [reporter, setReporter] = useState("");
  const [unit, setUnit] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchRows, setSearchRows] = useState(null);
  const [msg, setMsg] = useState("");

  const rows = useMemo(() => {
    return searchRows !== null ? searchRows : baseRows;
  }, [searchRows, baseRows]);

  const handleEdit = (m) => {
    navigate("/reserve", { state: { editMeeting: m } });
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("確定要刪除這筆會議嗎？");
    if (!ok) return;

    const r = await deleteMeeting(id);
    console.log("deleteMeeting result:", r, "deleted id:", id);

    if (!r.ok) {
      alert(r.message || "刪除失敗");
      return;
    }

    // 若目前是查詢模式，順便把查詢結果也移除
    if (searchRows !== null) {
      setSearchRows((prev) => prev.filter((m) => String(m.id) !== String(id)));
    }
  };

  // ====== 查詢 API ======
  const handleSearch = async () => {
    setMsg("");

    if (!from || !to) {
      setMsg("請先選擇起訖日期");
      return;
    }

    const params = new URLSearchParams({
      from,
      to,
      ...(place !== "all" ? { place } : {}),
      ...(q.trim() ? { q: q.trim() } : {}),
      ...(reporter.trim() ? { reporter: reporter.trim() } : {}),
      ...(unit.trim() ? { unit: unit.trim() } : {}),
    });

    setLoading(true);
    try {
      const url = `${API}/search?${params.toString()}`;
      console.log("search url:", url);

      const token = localStorage.getItem("token");

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const text = await res.text();
      const ct = res.headers.get("content-type") || "";
      console.log("status:", res.status, "content-type:", ct);
      console.log("body head:", text.slice(0, 120));

      const data = JSON.parse(text);

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setMsg("登入已過期，請重新登入");
        setSearchRows([]);
        navigate("/login");
        return;
      }

      if (!res.ok) {
        setMsg(data.message || "查詢失敗");
        setSearchRows([]);
        return;
      }

      setSearchRows(Array.isArray(data) ? data : []);
      if (!data?.length) setMsg("查無資料");
    } catch (err) {
      console.error(err);
      setMsg("查詢失敗（無法連線到伺服器）");
      setSearchRows([]);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setFrom("");
    setTo("");
    setPlace("all");
    setQ("");
    setReporter("");
    setUnit("");
    setSearchRows(null);
    setMsg("");
  };

  const isEndedMeeting = (m) => {
    const end = new Date(`${m.date}T${m.end_time || "00:00"}:00`);
    return end.getTime() < Date.now();
  };

  return (
    <main className="admin">
      <h2>會議管理</h2>

      {/* 查詢區塊 */}
      <section className="admin-search">
        <div className="admin-search-row">
          <label>
            開始日
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>

          <label>
            結束日
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>

          <label>
            會議室
            <select value={place} onChange={(e) => setPlace(e.target.value)}>
              <option value="all">全部</option>
              <option value="2F">二樓會議室</option>
              <option value="5F">五樓會議室</option>
            </select>
          </label>

          <label>
            提報人
            <input
              value={reporter}
              onChange={(e) => setReporter(e.target.value)}
              placeholder="請輸入提報人"
            />
          </label>

          <label>
            主辦單位
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="請輸入主辦單位"
            />
          </label>

          <label className="admin-search-q">
            關鍵字
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="會議名稱 / 單位 / 記錄 / 地點"
            />
          </label>

          <div className="admin-search-actions">
            <button
              className="btn-search"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? "查詢中..." : "查詢"}
            </button>

            {searchRows !== null && (
              <button
                className="btn-clear"
                onClick={clearSearch}
                disabled={loading}
              >
                清除查詢
              </button>
            )}
          </div>
        </div>

        {msg && <p className="admin-search-msg">{msg}</p>}
        {searchRows !== null && (
          <p className="admin-search-hint">
            目前顯示：查詢結果（{rows.length}）
          </p>
        )}
      </section>

      {/*  列表 */}
      {rows.length === 0 ? (
        <p>目前沒有任何會議。</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>會議名稱</th>
              <th>日期</th>
              <th>時間</th>
              <th>地點</th>
              <th>提報人</th>
              <th>主辦單位</th>
              <th>參加單位</th>
              <th>視訊</th>
              <th>參與人數</th>
              <th>編輯</th>
              <th>刪除</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.date}</td>
                <td>{m.timeLabel || `${m.start_time} - ${m.end_time}`}</td>
                <td>{m.place}</td>
                <td>{m.reporter}</td>
                <td>{m.unit}</td>
                <td>{m.people}</td>
                <td>{(m.isVideo ?? !!m.is_video) ? "是" : "否"}</td>
                <td>{m.participantCount ?? m.participant_count ?? 0}</td>
                <td>
                  <button className="btn-edit" onClick={() => handleEdit(m)}>
                    編輯
                  </button>
                </td>
                <td>
                  {!isEndedMeeting(m) && (
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(m.id)}
                    >
                      刪除
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
