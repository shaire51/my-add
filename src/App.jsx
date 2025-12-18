// src/App.jsx
import "./styles/App.css";
import Nav from "./components/Nav.jsx";
import Body from "./Page/Body.jsx";
import Reserve from "./Page/Reserve.jsx";
import Foot from "./components/Foot.jsx";
import Admin from "./Page/admin.jsx";
import Login from "./Page/login.jsx";
import Screen from "./Page/Screen.jsx";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MeetingsProvider } from "./stores/meetingsStore.jsx";

function App() {
  return (
    <MeetingsProvider>
      <BrowserRouter>
        <div className="board">
          <Nav />
          <Routes>
            <Route path="/" element={<Body />} />
            <Route path="/reserve" element={<Reserve />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/login" element={<Login />} />

            {/* 投影頁 */}
            <Route path="/screen/2" element={<Body previewFloor={2} />} />
            <Route path="/screen/5" element={<Body previewFloor={5} />} />
          </Routes>
          <Foot />
        </div>
      </BrowserRouter>
    </MeetingsProvider>
  );
}

export default App;
