// src/App.jsx
import "./App.css";
import Nav from "./src/components/Nav.jsx";
import Body from "./src/components/Body.jsx";
import Reserve from "./src/components/Reserve.jsx";
import Foot from "./src/components/Foot.jsx";
import Admin from "./src/components/admin.jsx";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./src/components/login.jsx";

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
