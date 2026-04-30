import { useMemo, useState } from "react";
import { useAuth } from "../stores/AuthContext.jsx";
import "../styles/PermissionAdmin.css";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const PERMISSION_OPTIONS = [
  { code: "permission.assign.admin", name: "賦予管理權限" },
  { code: "option.other.view", name: "查看其他選項" },
  { code: "meeting.export", name: "匯出會議資料" },
];

export default function PermissionAdmin() {
  const { user } = useAuth();

  const [empId, setEmpId] = useState("");
  const [queryEmpId, setQueryEmpId] = useState("");
  const [employee, setEmployee] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [selectedPermission, setSelectedPermission] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  const isAdmin = user?.permissions?.includes("permission.assign.admin");

  const existingCodes = useMemo(
    () => permissions.map((p) => p.code),
    [permissions],
  );

  const availableOptions = useMemo(() => {
    return PERMISSION_OPTIONS.filter(
      (item) => !existingCodes.includes(item.code),
    );
  }, [existingCodes]);

  const fetchUserPermissions = async (targetEmpId) => {
    setLoading(true);
    setError("");
    setMsg("");

    try {
      const res = await fetch(
        `${API_BASE}/api/permissions/user/${encodeURIComponent(targetEmpId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setEmployee(null);
        setPermissions([]);
        setError(data.message || "查詢失敗");
        return;
      }

      setEmployee(data.employee);
      setPermissions(data.permissions || []);
      setSelectedPermission("");
      setQueryEmpId(targetEmpId);
      setMsg("查詢成功");
    } catch (err) {
      setEmployee(null);
      setPermissions([]);
      setError("無法連線到伺服器");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!empId.trim()) {
      setError("請輸入員工編號");
      return;
    }
    await fetchUserPermissions(empId.trim());
  };

  const handleGrant = async () => {
    if (!queryEmpId) {
      setError("請先查詢員工");
      return;
    }

    if (!selectedPermission) {
      setError("請先選擇權限");
      return;
    }

    setSaving(true);
    setError("");
    setMsg("");

    try {
      const res = await fetch(`${API_BASE}/api/permissions/grant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          empId: queryEmpId,
          permissionCode: selectedPermission,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "新增權限失敗");
        return;
      }

      setMsg(data.message || "權限新增成功");
      await fetchUserPermissions(queryEmpId);
    } catch (err) {
      setError("無法連線到伺服器");
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (permissionCode) => {
    if (!queryEmpId) {
      setError("請先查詢員工");
      return;
    }

    const ok = window.confirm(`確定要移除權限：${permissionCode} 嗎？`);
    if (!ok) return;

    setSaving(true);
    setError("");
    setMsg("");

    try {
      const res = await fetch(`${API_BASE}/api/permissions/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          empId: queryEmpId,
          permissionCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "移除權限失敗");
        return;
      }

      setMsg(data.message || "權限移除成功");
      await fetchUserPermissions(queryEmpId);
    } catch (err) {
      setError("無法連線到伺服器");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <main className="permission-page permission-page--denied">
        <h2>權限管理</h2>
        <p>你沒有權限查看此頁面。</p>
      </main>
    );
  }

  return (
    <main className="permission-page">
      <h2 className="permission-page__title">權限管理</h2>

      <form className="permission-search-form" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="請輸入員工編號"
          value={empId}
          onChange={(e) => setEmpId(e.target.value)}
          className="permission-input"
        />

        <button
          type="submit"
          disabled={loading}
          className="permission-btn permission-btn--primary"
        >
          {loading ? "查詢中..." : "查詢"}
        </button>
      </form>

      {msg && (
        <p className="permission-message permission-message--success">{msg}</p>
      )}
      {error && (
        <p className="permission-message permission-message--error">{error}</p>
      )}

      {employee && (
        <section className="permission-card">
          <h3 className="permission-card__title">員工資料</h3>
          <div className="permission-employee-info">
            <p>
              <strong>員工編號：</strong>
              {employee.empId}
            </p>
            <p>
              <strong>姓名：</strong>
              {employee.name}
            </p>
          </div>

          <hr className="permission-divider" />

          <h3 className="permission-card__title">目前權限</h3>

          {permissions.length === 0 ? (
            <p>目前沒有任何權限</p>
          ) : (
            <div className="permission-list">
              {permissions.map((item) => (
                <div key={item.code} className="permission-item">
                  <div>
                    <div>
                      <strong>{item.name}</strong>
                    </div>
                    <div className="permission-item__meta">
                      賦予者：{item.granted_by || "-"}
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(item.code)}
                      disabled={saving}
                      className="permission-btn permission-btn--danger"
                    >
                      移除
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {isAdmin && (
            <>
              <hr className="permission-divider" />

              <h3 className="permission-card__title">新增權限</h3>

              <div className="permission-action-row">
                <select
                  value={selectedPermission}
                  onChange={(e) => setSelectedPermission(e.target.value)}
                  className="permission-select"
                >
                  <option value="">請選擇權限</option>
                  {availableOptions.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleGrant}
                  disabled={saving || !selectedPermission}
                  className="permission-btn permission-btn--primary"
                >
                  {saving ? "處理中..." : "新增權限"}
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}
