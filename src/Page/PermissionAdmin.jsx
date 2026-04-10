import { useMemo, useState } from "react";
import { useAuth } from "../stores/AuthContext.jsx";

const API_BASE = "http://192.168.76.165:3001";

const PERMISSION_OPTIONS = [
  { code: "permission.manage.view", name: "查看權限管理頁" },
  { code: "permission.assign", name: "賦予一般權限" },
  { code: "permission.assign.admin", name: "賦予管理權限" },
  { code: "meeting.admin", name: "會議管理員" },
  { code: "option.other.view", name: "查看其他選項" },
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

  const canView = user?.permissions?.includes("permission.manage.view");
  const canAssign = user?.permissions?.includes("permission.assign");

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

  if (!canView) {
    return (
      <main style={{ padding: "24px" }}>
        <h2>權限管理</h2>
        <p>你沒有權限查看此頁面。</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "16px" }}>權限管理</h2>

      <form
        onSubmit={handleSearch}
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <input
          type="text"
          placeholder="請輸入員工編號"
          value={empId}
          onChange={(e) => setEmpId(e.target.value)}
          style={{
            padding: "10px 12px",
            minWidth: "220px",
            border: "1px solid #ccc",
            borderRadius: "8px",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 16px",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          {loading ? "查詢中..." : "查詢"}
        </button>
      </form>

      {msg && <p style={{ color: "green" }}>{msg}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {employee && (
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "16px",
            marginTop: "16px",
          }}
        >
          <h3 style={{ marginTop: 0 }}>員工資料</h3>
          <p>員工編號：{employee.empId}</p>
          <p>姓名：{employee.name}</p>

          <hr style={{ margin: "16px 0" }} />

          <h3>目前權限</h3>
          {permissions.length === 0 ? (
            <p>目前沒有任何權限</p>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {permissions.map((item) => (
                <div
                  key={item.code}
                  style={{
                    border: "1px solid #e5e5e5",
                    borderRadius: "10px",
                    padding: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div>
                      <strong>{item.name}</strong>
                    </div>
                    <div style={{ fontSize: "14px", color: "#666" }}>
                      {item.code}
                    </div>
                    <div style={{ fontSize: "13px", color: "#888" }}>
                      賦予者：{item.granted_by || "-"} ／ 時間：
                      {item.granted_at || "-"}
                    </div>
                  </div>

                  {canAssign && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(item.code)}
                      disabled={saving}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "8px",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      移除
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {canAssign && (
            <>
              <hr style={{ margin: "20px 0" }} />

              <h3>新增權限</h3>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <select
                  value={selectedPermission}
                  onChange={(e) => setSelectedPermission(e.target.value)}
                  style={{
                    padding: "10px 12px",
                    minWidth: "260px",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                  }}
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
                  style={{
                    padding: "10px 16px",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
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
