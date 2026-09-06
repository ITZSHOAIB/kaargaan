import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { Disc3, House, Music2, Play } from "lucide-react";
import { HomePage } from "./pages/HomePage";
import { PreparePage } from "./pages/PreparePage";
import { GamePage } from "./pages/GamePage";

export default function App() {
  return <div className="app-frame">
    <header className="masthead">
      <div className="brand"><Disc3 size={30} aria-hidden="true" /><h1>KaarGaan<span lang="bn">কার গান?</span></h1></div>
      <nav aria-label="Main navigation">
        {[{to:"/",label:"Home",icon:House},{to:"/prepare",label:"Prepare songs",icon:Music2},{to:"/game",label:"Game",icon:Play}].map(({to,label,icon:Icon}) =>
          <NavLink end key={to} to={to} className={({isActive})=>isActive?"nav-link active":"nav-link"}><Icon size={16} aria-hidden="true"/>{label}</NavLink>)}
      </nav>
    </header>
    <main id="main-content"><Routes>
      <Route path="/" element={<HomePage/>}/><Route path="/prepare" element={<PreparePage/>}/>
      <Route path="/game" element={<GamePage/>}/><Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes></main>
    <footer className="page-footer"><span>A room full of friends. A playlist full of suspects.</span><span>KaarGaan</span></footer>
  </div>;
}
