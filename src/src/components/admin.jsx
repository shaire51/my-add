import { useMeetings } from "./meetingsStore.jsx";
import "./admin.css";

export default function Admin() {
  const { toRows, deleteMeeting } = useMeetings();
  const rows = toRows();

  const handleDelete = async (id) => {
    const ok = window.confirm("確定要刪除這筆會議嗎？");
    if (!ok) return;

    try {
      const res = await fetch(`http://192.168.76.165:3001/api/meetings/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "刪除失敗（後端錯誤）");
        return;
      }

      // 後端刪掉之後，再從前端 store 移除
      deleteMeeting(id);
    } catch (err) {
      console.error(err);
      alert("刪除失敗（無法連線到伺服器）");
    }
  };

  return (
    <main className="admin">
      <h2>會議管理</h2>
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
              <th>刪除</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.date}</td>
                <td>{m.timeLabel}</td>
                <td>{m.place}</td>
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
