// src/components/Reserve.jsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/Reserve.css";
import { useMeetings } from "../stores/meetingsStore.jsx";
import { useAuth } from "../stores/AuthContext.jsx";

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

// 時間選擇器
function TimeSelect({ id, value, onChange }) {
  const hours = Array.from({ length: 11 }, (_, i) => 8 + i); // 8~18
  const minutes = [0, 1, 15, 30, 31];

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
  const { addMeeting, updateMeeting, canAddMeeting } = useMeetings();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const editMeeting = location.state?.editMeeting || null;
  const editingId = editMeeting?.id || null;
  const [form, setForm] = useState({
    id: null,
    name: "",
    unit: "",
    date: "",
    start: "",
    end: "",
    people: "",
    place: "",
    file: null,
  });

  const [msg, setMsg] = useState(null);
  useEffect(() => {
    if (!editMeeting) return;

    setForm((p) => ({
      ...p,
      id: editMeeting.id,
      name: editMeeting.name ?? "",
      unit: editMeeting.unit ?? "",
      date: editMeeting.date ?? "",
      start: editMeeting.start ?? editMeeting.start_time ?? "",
      end: editMeeting.end ?? editMeeting.end_time ?? "",
      people: editMeeting.people ?? "",
      place: editMeeting.place ?? "",
      file: null, // 編輯時先不帶舊檔，需使用者重新選
    }));
  }, [editMeeting]);
  const handleFieldChange = (e) => {
    const { id, value } = e.target;
    setForm((p) => ({ ...p, [id]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    const ext = name.split(".").pop();

    const allowedExt = ["jpg", "jpeg", "png", "tif", "tiff"];
    const allowedMime = ["image/jpeg", "image/png", "image/tiff"];

    const ok =
      allowedExt.includes(ext) &&
      (allowedMime.includes(file.type) || file.type === "");

    if (!ok) {
      alert("只能上傳 jpg/jpeg/png/tif/tiff 圖片檔");
      e.target.value = "";
      setForm((p) => ({ ...p, file: null }));
      return;
    }

    setForm((p) => ({ ...p, file })); // ✅ 存進 form.file
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const isEdit = !!form.id;
    setMsg(null);

    // 必填欄位檢查
    if (!form.name || !form.date || !form.start || !form.end || !form.place) {
      setMsg({ type: "error", text: "請填寫必填欄位！" });
      return;
    }

    //  檔案格式檢查（一定要在讀檔前）
    if (form.file) {
      const allowedTypes = ["image/jpeg", "image/tiff"];
      const allowedExt = ["jpg", "jpeg", "tif", "tiff", "png"];

      const fileType = form.file.type;
      const fileExt = form.file.name.split(".").pop().toLowerCase();

      if (!allowedTypes.includes(fileType) && !allowedExt.includes(fileExt)) {
        setMsg({ type: "error", text: "附件僅限 JPG,TIF,png 格式" });
        return;
      }
    }

    //  處理附件（通過檢查後才讀）
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
      //  時段衝突檢查
      const check = canAddMeeting({
        id: form.id,
        name: form.name.trim(),
        unit: form.unit.trim(),
        date: form.date,
        start: form.start,
        end: form.end,
        people: form.people.trim(),
        reporter: user.name,
        place: form.place.trim(),
      });

      if (!check.ok) {
        setMsg({ type: "error", text: check.message });
        return;
      }

      //  送後端
      const payload = {
        name: form.name.trim(),
        unit: form.unit.trim(),
        date: form.date,
        start_time: form.start,
        end_time: form.end,
        people: form.people.trim(),
        reporter: user.name,
        place: form.place.trim(),
      };

      const API_BASE = "http://192.168.76.165:3001";

      const url = isEdit
        ? `${API_BASE}/api/meetings/${form.id}`
        : `${API_BASE}/api/meetings`;

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("API error:", res.status, data);
        setMsg({
          type: "error",
          text:
            data.message ||
            (isEdit
              ? `後端更新失敗(${res.status})`
              : `後端儲存失敗(${res.status})`),
        });
        return;
      }

      //  寫入前端 store（含附件）
      if (!isEdit) {
        // ✅ 新增才寫入 store
        const { ok, error } = addMeeting({
          id: data.id,
          name: form.name.trim(),
          unit: form.unit.trim(),
          date: form.date,
          start: form.start,
          end: form.end,
          reporter: user.name,
          people: form.people.trim(),
          place: form.place.trim(),
          attachments,
        });

        if (!ok) {
          setMsg({ type: "error", text: error || "預約失敗，時間衝突" });
          return;
        }

        setMsg({ type: "ok", text: "預約成功，已寫入資料庫並加入排程！" });

        setForm({
          id: null,
          name: "",
          unit: "",
          date: "",
          start: "",
          end: "",
          people: "",
          place: "",
          file: null,
        });
      } else {
        // ✅ 編輯成功：更新 store 這筆資料
        updateMeeting({
          id: form.id,
          name: form.name.trim(),
          unit: form.unit.trim(),
          date: form.date,
          start: form.start,
          end: form.end,
          start_time: form.start, // 若你別處用 start_time 也一起帶
          end_time: form.end,
          people: form.people.trim(),
          place: form.place.trim(),
          reporter: user.name,
        });

        setMsg({ type: "ok", text: "更新成功！" });
        navigate("/admin");
        return;
      }
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
              <input id="name" value={form.name} onChange={handleFieldChange} />
            </div>

            <div className="reserve-field">
              <label>主辦單位</label>
              <input id="unit" value={form.unit} onChange={handleFieldChange} />
            </div>
          </div>

          <div className="reserve-field">
            <label>會議日期</label>
            <input
              id="date"
              type="date"
              value={form.date}
              onChange={handleFieldChange}
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
            <input value={user.name} readOnly />
          </div>

          <div className="reserve-field">
            <label>參加人員</label>
            <input
              id="people"
              value={form.people}
              onChange={handleFieldChange}
            />
          </div>

          <div className="reserve-field">
            <label>地點</label>
            <select id="place" value={form.place} onChange={handleFieldChange}>
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
              accept="image/jpeg,image/png,image/tiff,.jpg,.jpeg,.png,.tif,.tiff"
              onChange={handleFileChange}
            />
          </div>

          <button type="submit" className="reserve-submit">
            {form.id ? "儲存修改" : "送出預約"}
          </button>

          {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
        </form>
      </section>
    </div>
  );
}
