import { Link, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Disc3 } from "lucide-react";
import { useState } from "react";
import { RoomHeaderTarget } from "./lib/roomHeader";
import { HomePage } from "./pages/HomePage";
import { GamePage } from "./pages/GamePage";
import { CardPage } from "./pages/card/CardPage";
import { StagePage } from "./pages/stage/StagePage";
import { UpdateBanner } from "./components/UpdateBanner";

export default function App() {
  return <>
    <UpdateBanner />
    <Routes>
      <Route path="/" element={<HomePage/>}/>
      <Route path="/card" element={<CardPage/>}/>
      <Route path="/stage" element={<StagePage/>}/>
      <Route path="/player" element={<Navigate to="/card" replace/>}/>
      <Route path="/prepare" element={<Navigate to="/card" replace/>}/>
      <Route element={<LegacyFrame/>}>
        <Route path="/host" element={<GamePage/>}/>
        <Route path="/game" element={<Navigate to="/host" replace/>}/>
      </Route>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  </>;
}

/** The pre-revamp page frame, kept until the stage screens replace it. */
function LegacyFrame() {
  const [roomTarget, setRoomTarget] = useState<HTMLDivElement | null>(null);
  return <RoomHeaderTarget.Provider value={roomTarget}><div className="app-frame">
    <a className="skip-link" href="#main-content">Skip to game content</a>
    <header className="masthead">
      <Link className="brand" to="/" aria-label="KaarGaan home"><Disc3 size={30} aria-hidden="true" /><h1>KaarGaan<span lang="bn">কার গান?</span></h1></Link>
      <div ref={setRoomTarget} className="header-room-slot" />
    </header>
    <main id="main-content"><Outlet/></main>
    <footer className="page-footer"><span>A room full of friends. A playlist full of suspects.</span><span>KaarGaan</span></footer>
  </div></RoomHeaderTarget.Provider>;
}
