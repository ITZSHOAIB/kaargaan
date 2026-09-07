import { Link, Navigate, Route, Routes } from "react-router-dom";
import { Disc3 } from "lucide-react";
import { useState } from "react";
import { RoomHeaderTarget } from "./lib/roomHeader";
import { HomePage } from "./pages/HomePage";
import { PreparePage } from "./pages/PreparePage";
import { GamePage } from "./pages/GamePage";

export default function App() {
  const [roomTarget, setRoomTarget] = useState<HTMLDivElement | null>(null);
  return <RoomHeaderTarget.Provider value={roomTarget}><div className="app-frame">
    <a className="skip-link" href="#main-content">Skip to game content</a>
    <header className="masthead">
      <Link className="brand" to="/" aria-label="KaarGaan home"><Disc3 size={30} aria-hidden="true" /><h1>KaarGaan<span lang="bn">কার গান?</span></h1></Link>
      <div ref={setRoomTarget} className="header-room-slot" />
    </header>
    <main id="main-content"><Routes>
      <Route path="/" element={<HomePage/>}/><Route path="/player" element={<PreparePage/>}/>
      <Route path="/host" element={<GamePage/>}/>
      <Route path="/prepare" element={<Navigate to="/player" replace/>}/><Route path="/game" element={<Navigate to="/host" replace/>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes></main>
    <footer className="page-footer"><span>A room full of friends. A playlist full of suspects.</span><span>KaarGaan</span></footer>
  </div></RoomHeaderTarget.Provider>;
}
