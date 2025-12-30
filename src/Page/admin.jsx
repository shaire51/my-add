import { useMeetings } from "../stores/meetingsStore.jsx";
import "../styles/admin.css";

export default function Admin() {
  //引入 useMeetings functuin
  const { toRows, deleteMeeting } = useMeetings();
  //將 meetingsStore 裡面的toRows 變成rows參數使用
  const rows = toRows();

  const handleDelete = async (id) => {
    const ok = window.confirm("確定要刪除這筆會議嗎？");
    //取消就回去
    if (!ok) return;
    //如果確定就針對id進行刪除
    try {
      const res = await fetch(`http://192.168.76.165:3001/api/meetings/${id}`, {
        method: "DELETE",
      });
      //檢查無法刪除的這筆是什麼資訊
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "刪除失敗（後端錯誤）");
        return;
      }
      //同步刪除 Store
      deleteMeeting(id);
      //如果無法連上就會跳到這
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
