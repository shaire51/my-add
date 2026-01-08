import { createContext, useContext, useState } from "react"; //React的資源包

const AuthContext = createContext(null); //將 creat的功能存到 AuthCon

export function AuthProvider({ children }) {
  // 將所有內容包在 AuthContext.Provider內
  const [user, setUser] = useState(JSON.parse(sessionStorage.getItem("user"))); // 將 localstorage 裡面的user資料
  // 把字串 parse 回 JS 物件
  // 舉例 sessionStorage.getItem("user") → '{"name":"A"}'（字串）
  // JSON.parse(...) → { name: "A" }（物件）
  // user.name 才能用，因為 user 已經不是字串了
  const login = (userData) => {
    // 將setUser的資料存進 userData 然後給到login  將轉成JSON的user轉成字串 因為 loc必須是字串才能存
    setUser(userData);
    sessionStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    //清除使用者登入狀態
    setUser(null);
    sessionStorage.removeItem("user"); //同步清掉localStorage 避免下次登入還是顯示登入中
  };
  //將資料提供給整個 AuthContext  裡面的值包含 user + login 登入 + logout 登出
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); // 將 useContext 封裝成 useAuth 這樣只要呼叫 useAuth就能使用整個功能
