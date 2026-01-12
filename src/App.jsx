import "./styles/App.css";
import Nav from "./components/Nav.jsx";
import Body from "./Page/Body.jsx";
import Reserve from "./Page/Reserve.jsx";
import Foot from "./components/Foot.jsx";
import Admin from "./Page/admin.jsx";
import Login from "./Page/login.jsx";

import { BrowserRouter, Routes, Route } from "react-router-dom";

import { MeetingsProvider } from "./stores/meetingsStore.jsx";
import { AuthProvider } from "./stores/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

function App() {
  return (
    <AuthProvider>
      <MeetingsProvider>
        <BrowserRouter>
          <div className="board">
            <Nav />

            <Routes>
              <Route path="/" element={<Body />} />
              <Route //分配路徑
                path="/reserve" //保護reserve
                element={
                  //導向
                  <ProtectedRoute>
                    <Reserve />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                }
              />

              <Route path="/admin" element={<Admin />} />
              <Route path="/login" element={<Login />} />

              {/* 投影頁（不用登入） */}
              <Route path="/screen/2" element={<Body previewFloor={2} />} />
              <Route path="/screen/5" element={<Body previewFloor={5} />} />
            </Routes>

            <Foot />
          </div>
        </BrowserRouter>
      </MeetingsProvider>
    </AuthProvider>
  );
}

export default App;
