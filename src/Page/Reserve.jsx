// src/components/Reserve.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/Reserve.css";
import { useMeetings } from "../stores/meetingsStore.jsx";
import { useAuth } from "../stores/AuthContext.jsx";
import { reserveSchema } from "../schemas/reserveSchema.js";

const pad2 = (n) => String(n).padStart(2, "0");
const API_BASE = "http://192.168.76.165:3001";

// 時間選擇器
function TimeSelect({ id, value, onChange }) {
  const hours = Array.from({ length: 11 }, (_, i) => 8 + i); // 8~18
  const minutes = [0, 30];

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
  const { addMeeting, updateMeeting, canAddMeeting, toUpcomingRows } =
    useMeetings();
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
    isVideo: false,
    participantCount: "",
    file: null,
  });

  const [msg, setMsg] = useState(null);
  const [errors, setErrors] = useState({});
  const [alternatives, setAlternatives] = useState([]);
  const [conflicts, setConflicts] = useState([]);
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
      isVideo: !!editMeeting.isVideo,
      participantCount: editMeeting.participantCount ?? "",
      file: null,
    }));
  }, [editMeeting]);
  const handleFieldChange = (e) => {
    const { id, value } = e.target;
    setForm((p) => ({ ...p, [id]: value }));
    setErrors((prev) => ({ ...prev, [id]: "" }));
  };

  const next7Rows = useMemo(() => {
    const rows = toUpcomingRows ? toUpcomingRows() : [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const end = new Date(today);
    end.setDate(end.getDate() + 7);

    return rows
      .filter((r) => {
        if (!r?.date) return false;
        const d = new Date(`${r.date}T00:00:00`);
        return d >= today && d <= end;
      })
      .sort((a, b) => {
        const ad = new Date(
          `${a.date}T${a.start || a.start_time || "00:00"}:00`,
        ).getTime();
        const bd = new Date(
          `${b.date}T${b.start || b.start_time || "00:00"}:00`,
        ).getTime();
        return ad - bd;
      });
  }, [toUpcomingRows]);

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
    setAlternatives([]);
    setConflicts([]);

    const result = reserveSchema.safeParse(form);

    if (!result.success) {
      const fieldErrors = {};

      result.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      });

      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    if (form.file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/tiff"];
      const allowedExt = ["jpg", "jpeg", "png", "tif", "tiff"];

      const fileType = form.file.type;
      const fileExt = form.file.name.split(".").pop().toLowerCase();

      if (!allowedTypes.includes(fileType) && !allowedExt.includes(fileExt)) {
        setMsg({
          type: "error",
          text: "附件僅限 JPG、JPEG、PNG、TIF、TIFF 格式",
        });
        return;
      }
    }

    const meetingForCheck = {
      id: form.id,
      name: form.name.trim(),
      unit: form.unit.trim(),
      date: form.date,
      start: form.start,
      end: form.end,
      people: form.people.trim(),
      reporter: user.name,
      place: form.place.trim(),
      isVideo: form.isVideo,
      participantCount: Number(form.participantCount) || 0,
    };

    try {
      const check = canAddMeeting(meetingForCheck);

      if (!check.ok) {
        setMsg({ type: "error", text: check.message });
        setAlternatives(check.alternatives || []);
        setConflicts(check.conflicts || []);
        return;
      }

      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("unit", form.unit.trim());
      fd.append("date", form.date);
      fd.append("start_time", form.start);
      fd.append("end_time", form.end);
      fd.append("people", form.people.trim());
      fd.append("reporter", user.name);
      fd.append("place", form.place.trim());
      fd.append("is_video", form.isVideo ? 1 : 0);
      fd.append("participant_count", Number(form.participantCount) || 0);

      if (form.file) {
        fd.append("attachment", form.file);
      }

      if (isEdit) {
        const r = await updateMeeting(form.id, fd);

        if (!r.ok) {
          setMsg({ type: "error", text: r.message || "更新失敗" });
          return;
        }

        setMsg({ type: "ok", text: "更新成功！" });
        navigate("/admin");
        return;
      }

      const r = await addMeeting(fd, meetingForCheck);

      if (!r.ok) {
        setMsg({ type: "error", text: r.message || "新增失敗" });
        return;
      }

      setMsg({ type: "ok", text: "預約成功！" });
      setForm({
        id: null,
        name: "",
        unit: "",
        date: "",
        start: "",
        end: "",
        people: "",
        place: "",
        isVideo: false,
        participantCount: "",
        file: null,
      });
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: "預約失敗（後端無法儲存）" });
    }
  };

  return (
    <div className="reserve-page">
      <div className="reserve-layout">
        <div className="reserve-left">
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
                  <label
                    className={
                      errors.name ? "field-label error" : "field-label"
                    }
                  >
                    會議名稱
                  </label>
                  <input
                    id="name"
                    value={form.name}
                    onChange={handleFieldChange}
                    className={errors.name ? "input-error" : ""}
                  />
                  {errors.name && (
                    <p className="field-error-text">⚠ {errors.name}</p>
                  )}
                </div>

                <div className="reserve-field">
                  <label
                    className={
                      errors.unit ? "field-label error" : "field-label"
                    }
                  >
                    主辦單位
                  </label>
                  <input
                    id="unit"
                    value={form.unit}
                    onChange={handleFieldChange}
                    className={errors.unit ? "input-error" : ""}
                  />
                  {errors.unit && (
                    <p className="field-error-text">⚠ {errors.unit}</p>
                  )}
                </div>
              </div>

              <div className="reserve-field">
                <label
                  className={errors.date ? "field-label error" : "field-label"}
                >
                  會議日期
                </label>
                <input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={handleFieldChange}
                  className={errors.date ? "input-error" : ""}
                />
                {errors.date && (
                  <p className="field-error-text">⚠{errors.date}</p>
                )}
              </div>

              <div className="reserve-field">
                <label
                  className={
                    errors.start || errors.end
                      ? "field-label error"
                      : "field-label"
                  }
                >
                  會議時間
                </label>

                <div className="meeting-time-video-row">
                  <div
                    className={`reserve-row time-row ${
                      errors.start || errors.end ? "time-row-error" : ""
                    }`}
                  >
                    <TimeSelect
                      id="start"
                      value={form.start}
                      onChange={(v) => {
                        setForm((p) => ({ ...p, start: v }));
                        setErrors((prev) => ({ ...prev, start: "" }));
                      }}
                    />
                    <span className="time-sep">~</span>
                    <TimeSelect
                      id="end"
                      value={form.end}
                      onChange={(v) => {
                        setForm((p) => ({ ...p, end: v }));
                        setErrors((prev) => ({ ...prev, end: "" }));
                      }}
                    />
                  </div>

                  <div className="video-inline">
                    <span className="video-label">是否視訊：</span>
                    <label className="video-check-wrap">
                      <input
                        id="isVideo"
                        type="checkbox"
                        checked={form.isVideo}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, isVideo: e.target.checked }))
                        }
                      />
                      <span>{form.isVideo ? "是" : "否"}</span>
                    </label>
                  </div>
                </div>
                {(errors.start || errors.end) && (
                  <p className="field-error-text">
                    ⚠ {errors.start || errors.end}
                  </p>
                )}
              </div>

              <div className="reserve-field">
                <label>提報人</label>
                <input value={user.name} readOnly />
              </div>

              <div className="reserve-field">
                <label
                  className={
                    errors.people ? "field-label error" : "field-label"
                  }
                >
                  參加人員
                </label>
                <input
                  id="people"
                  value={form.people}
                  onChange={handleFieldChange}
                  className={errors.people ? "input-error" : ""}
                />
                {errors.people && (
                  <p className="field-error-text">⚠ {errors.people}</p>
                )}
              </div>

              <div className="reserve-field">
                <label
                  className={errors.place ? "field-label error" : "field-label"}
                >
                  會議室
                </label>
                <select
                  id="place"
                  value={form.place}
                  onChange={handleFieldChange}
                  className={errors.place ? "input-error" : ""}
                >
                  <option value="">請選擇會議室</option>
                  <option value="五樓會議室">五樓會議室</option>
                  <option value="二樓會議室">二樓會議室</option>
                </select>
                {errors.place && (
                  <p className="field-error-text">⚠{errors.place}</p>
                )}
              </div>
              <div className="reserve-field">
                <label className="field-label">參與人數</label>
                <input
                  id="participantCount"
                  type="number"
                  min="0"
                  value={form.participantCount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, participantCount: e.target.value }))
                  }
                  placeholder="請輸入參與人數"
                />
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

              {msg?.type === "error" && alternatives.length > 0 && (
                <div className="alt-box">
                  <p className="alt-title">此時段可預約的會議室：</p>

                  <div className="alt-list">
                    {alternatives.map((room) => (
                      <button
                        key={room}
                        type="button"
                        className="alt-btn"
                        onClick={() => {
                          setForm((p) => ({ ...p, place: room }));
                          setMsg({
                            type: "ok",
                            text: `已改為「${room}」，請再送出預約。`,
                          });
                          setAlternatives([]);
                        }}
                      >
                        {room}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {msg?.type === "error" && conflicts.length > 0 && (
                <div className="conflict-box">
                  <p className="conflict-title">衝突的會議資訊：</p>

                  <ul className="conflict-list">
                    {conflicts.map((m) => (
                      <li key={m.id} className="conflict-item">
                        <div className="conflict-top">
                          <p>{m.date}</p>
                          <span>
                            {m.start}~{m.end}
                          </span>
                        </div>
                        <div className="conflict-name">
                          {m.name || "(未命名會議)"}
                        </div>
                        <div className="conflict-meta">
                          {m.place}
                          {m.reporter ? ` · ${m.reporter}` : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </form>
          </section>
        </div>

        {/* 右欄：近 7 天 */}
        <aside className="reserve-right">
          <div className="reserve-side-card">
            <div className="reserve-side-head">
              <h3 className="reserve-side-title">近 7 天會議</h3>
              <span className="reserve-side-count">{next7Rows.length} 筆</span>
            </div>

            {next7Rows.length === 0 ? (
              <p className="reserve-empty">近 7 天沒有會議</p>
            ) : (
              <ul className="reserve-side-list">
                {next7Rows.map((r) => {
                  const start = r.start ?? r.start_time ?? "";
                  const end = r.end ?? r.end_time ?? "";
                  return (
                    <li key={r.id} className="reserve-side-item">
                      <button
                        type="button"
                        className="reserve-side-btn"
                        onClick={() => {
                          navigate("/admin", { state: { autoEditId: r.id } });
                        }}
                      >
                        <div className="reserve-side-top">
                          <span className="reserve-side-date">{r.date}</span>
                          <span className="reserve-side-time">
                            {start}–{end}
                          </span>
                        </div>
                        <div className="reserve-side-name">
                          {r.name || "(未命名會議)"}
                        </div>
                        <div className="reserve-side-meta">
                          <span>{r.place}</span>
                          {r.reporter ? <span> · {r.reporter}</span> : null}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
