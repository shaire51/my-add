// src/App.jsx
import "./styles/App.css";
import Nav from "./components/Nav.jsx";
import Body from "./Page/Body.jsx";
import Reserve from "./Page/Reserve.jsx";
import Foot from "./components/Foot.jsx";
import Admin from "./Page/admin.jsx";
import Login from "./Page/login.jsx";
import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <div className="board">
        <Nav />
        <Routes>
          <Route path="/" element={<Body />} />
          <Route path="/reserve" element={<Reserve />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/login" element={<Login />} />
        </Routes>
        <Foot />
      </div>
    </BrowserRouter>
  );
}

export default App;
