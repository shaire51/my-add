// src/components/Reserve.jsx
import { useState } from "react";
import "../styles/Reserve.css";
import { useMeetings } from "../stores/meetingsStore.jsx";

const pad2 = (n) => String(n).padStart(2, "0");

// 把檔案讀成 base64，之後 Body 要做預覽／下載用
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

// 時間選擇器（08:00~18:55，每 5 分鐘）
function TimeSelect({ id, value, onChange }) {
  const hours = Array.from({ length: 11 }, (_, i) => 8 + i); // 8~18
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const h = value ? Number(value.split(":")[0]) : "";
  const m = value ? Number(value.split(":")[1]) : "";

  return (
    <div className="time-select">
      <select
        aria-label={`${id}-hour`}
        value={h}
        onChange={(e) => {
          const hh = Number(e.target.value);
          onChange(`${pad2(hh)}:${pad2(m === "" ? 0 : m)}`);
        }}
      >
        <option value="">HH</option>
        {hours.map((hh) => (
          <option key={hh} value={hh}>
            {pad2(hh)}
          </option>
        ))}
      </select>

      <span className="colon">:</span>

      <select
        aria-label={`${id}-minute`}
        value={m}
        onChange={(e) => {
          const mm = Number(e.target.value);
          onChange(`${pad2(h === "" ? 8 : h)}:${pad2(mm)}`);
        }}
      >
        <option value="">MM</option>
        {minutes.map((mm) => (
          <option key={mm} value={mm}>
            {pad2(mm)}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function Reserve() {
  const { addMeeting, canAddMeeting } = useMeetings();

  const [form, setForm] = useState({
    name: "",
    unit: "",
    date: "",
    start: "",
    end: "",
    reporter: "",
    people: "",
    place: "",
    file: null,
  });

  const [msg, setMsg] = useState(null);

  const onChange = (e) => {
    const { id, value, files } = e.target;
    if (id === "fileUpload") {
      setForm((p) => ({ ...p, file: files?.[0] ?? null }));
    } else {
      setForm((p) => ({ ...p, [id]: value }));
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);

    // 1️⃣ 必填欄位檢查
    if (!form.name || !form.date || !form.start || !form.end || !form.place) {
      setMsg({ type: "error", text: "請填寫必填欄位！" });
      return;
    }

    // 2️⃣ ⭐ 檔案格式檢查（一定要在讀檔前）
    if (form.file) {
      const allowedTypes = ["image/jpeg", "image/tiff"];
      const allowedExt = ["jpg", "jpeg", "tif", "tiff", "png"];

      const fileType = form.file.type; // 有些瀏覽器可能是 ""
      const fileExt = form.file.name.split(".").pop().toLowerCase();

      if (!allowedTypes.includes(fileType) && !allowedExt.includes(fileExt)) {
        setMsg({ type: "error", text: "附件僅限 JPG 或 TIF 格式" });
        return;
      }
    }

    // 3️⃣ 處理附件（通過檢查後才讀）
    let attachments = [];
    if (form.file) {
      const dataUrl = await readFileAsDataURL(form.file);
      attachments = [
        {
          name: form.file.name,
          type: form.file.type,
          size: form.file.size,
          dataUrl,
        },
      ];
    }

    try {
      // 4️⃣ 時段衝突檢查
      const check = canAddMeeting({
        name: form.name.trim(),
        unit: form.unit.trim(),
        date: form.date,
        start: form.start,
        end: form.end,
        people: form.people.trim(),
        reporter: form.reporter.trim(),
        place: form.place.trim(),
      });

      if (!check.ok) {
        setMsg({ type: "error", text: check.message });
        return;
      }

      // 5️⃣ 送後端
      const payload = {
        name: form.name.trim(),
        unit: form.unit.trim(),
        date: form.date,
        start_time: form.start,
        end_time: form.end,
        people: form.people.trim(),
        reporter: form.reporter.trim(),
        place: form.place.trim(),
      };

      const res = await fetch("http://localhost:3001/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("後端儲存失敗");

      const data = await res.json();

      // 6️⃣ 寫入前端 store（含附件）
      const { ok, error } = addMeeting({
        id: data.id,
        name: form.name.trim(),
        unit: form.unit.trim(),
        date: form.date,
        start: form.start,
        end: form.end,
        people: form.people.trim(),
        reporter: form.reporter.trim(),
        place: form.place.trim(),
        attachments,
      });

      if (!ok) {
        setMsg({ type: "error", text: error || "預約失敗，時間衝突" });
        return;
      }

      setMsg({ type: "ok", text: "預約成功，已寫入資料庫並加入排程！" });

      // 7️⃣ 清空表單
      setForm({
        name: "",
        unit: "",
        date: "",
        start: "",
        end: "",
        reporter: "",
        people: "",
        place: "",
        file: null,
      });
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: "預約失敗（後端無法儲存）" });
    }
  };

  return (
    <div className="reserve-page">
      {/* 上面大框 */}
      <section className="reserve-hero">
        <div className="reserve-hero-inner">
          <h1 className="reserve-title">會議預約系統</h1>
          <p className="reserve-subtitle">預約規範說明</p>
          <ol className="reserve-rules">
            <li>會議可預約時段為 8:00 ~ 18:00。</li>
            <li>不得與其他會議時間重複。</li>
            <li>填寫表單前請先登入員工帳號</li>
          </ol>
        </div>
      </section>

      {/* 表單卡片 */}
      <section className="reserve-form-section">
        <h2 className="reserve-form-title">預約系統</h2>

        <form className="reserve-form" onSubmit={onSubmit}>
          <div className="reserve-row">
            <div className="reserve-field">
              <label>會議名稱</label>
              <input id="name" value={form.name} onChange={onChange} />
            </div>

            <div className="reserve-field">
              <label>主辦單位</label>
              <input id="unit" value={form.unit} onChange={onChange} />
            </div>
          </div>

          <div className="reserve-field">
            <label>會議日期</label>
            <input
              id="date"
              type="date"
              value={form.date}
              onChange={onChange}
            />
          </div>

          <div className="reserve-field">
            <label>會議時間</label>
            <div className="reserve-row time-row">
              <TimeSelect
                id="start"
                value={form.start}
                onChange={(v) => setForm((p) => ({ ...p, start: v }))}
              />
              <span className="time-sep">~</span>
              <TimeSelect
                id="end"
                value={form.end}
                onChange={(v) => setForm((p) => ({ ...p, end: v }))}
              />
            </div>
          </div>

          <div className="reserve-field">
            <label>提報人</label>
            <input id="reporter" value={form.reporter} onChange={onChange} />
          </div>

          <div className="reserve-field">
            <label>參加人員</label>
            <input id="people" value={form.people} onChange={onChange} />
          </div>

          <div className="reserve-field">
            <label>地點</label>
            <select id="place" value={form.place} onChange={onChange}>
              <option value="">請選擇會議室</option>
              <option value="五樓會議室">五樓會議室</option>
              <option value="二樓會議室">二樓會議室</option>
            </select>
          </div>

          <div className="reserve-field">
            <label>附件上傳</label>
            <input
              type="file"
              id="fileUpload"
              accept=".jpg,.jpeg,.tif,.tiff,image/jpeg,image/tiff,.png"
              onChange={onChange}
            />
          </div>

          <button type="submit" className="reserve-submit">
            送出預約
          </button>

          {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
        </form>
      </section>
    </div>
  );
}
