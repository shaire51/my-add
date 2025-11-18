import { useMeetings } from "./meetingsStore.jsx";
import "./Admin.css";

export default function Admin() {
  const { toRows, deleteMeeting } = useMeetings();
  const rows = toRows();

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
                    onClick={() => deleteMeeting(m.id)}
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
