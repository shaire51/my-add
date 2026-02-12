import { useMemo, useState } from "react";

import { useMeetings } from "../stores/meetingsStore.jsx";
import "../styles/admin.css";
import { useNavigate } from "react-router-dom";

const API = "http://192.168.76.165:3001/api/meetings";

export default function Admin() {
  const { toNotStartedRows, deleteMeeting } = useMeetings();
  const baseRows = toNotStartedRows();
  const navigate = useNavigate();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [place, setPlace] = useState("all"); // all | 2F | 5F
  const [q, setQ] = useState("");
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

    try {
      const res = await fetch(`${API}/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "刪除失敗（後端錯誤）");
        return;
      }

      deleteMeeting(id);

      if (searchRows !== null) {
        setSearchRows((prev) => (prev || []).filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error(err);
      alert("刪除失敗（無法連線到伺服器）");
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
    });

    setLoading(true);
    try {
      const url = `${API}/search?${params.toString()}`;
      console.log("search url:", url);

      const res = await fetch(url);

      const text = await res.text(); // ✅ 先拿純文字
      const ct = res.headers.get("content-type") || "";
      console.log("status:", res.status, "content-type:", ct);
      console.log("body head:", text.slice(0, 120));

      const data = JSON.parse(text);

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
    setSearchRows(null);
    setMsg("");
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
            樓層
            <select value={place} onChange={(e) => setPlace(e.target.value)}>
              <option value="all">全部</option>
              <option value="2F">2F</option>
              <option value="5F">5F</option>
            </select>
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

      {/* ✅ 列表 */}
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
              <th>編輯</th>
              <th>刪除</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.date}</td>

                {/* ✅ 兼容兩種資料格式：
                    1) 你 store 的 rows 有 timeLabel
                    2) search API 回來是 start_time / end_time
                */}
                <td>{m.timeLabel || `${m.start_time} - ${m.end_time}`}</td>

                <td>{m.place}</td>

                <td>
                  <button className="btn-edit" onClick={() => handleEdit(m)}>
                    編輯
                  </button>
                </td>

                <td>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(m.id)}
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
