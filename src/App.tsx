import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { CardPage } from "./pages/card/CardPage";
import { PlayPage } from "./pages/play/PlayPage";
import { StagePage } from "./pages/stage/StagePage";
import { UpdateBanner } from "./ui/UpdateBanner";

export default function App() {
  return <>
    <UpdateBanner />
    <Routes>
      <Route path="/" element={<HomePage/>}/>
      <Route path="/card" element={<CardPage/>}/>
      <Route path="/stage" element={<StagePage/>}/>
      <Route path="/play" element={<PlayPage/>}/>
      {/* Older links and installed shortcuts */}
      <Route path="/player" element={<Navigate to="/card" replace/>}/>
      <Route path="/prepare" element={<Navigate to="/card" replace/>}/>
      <Route path="/host" element={<Navigate to="/play" replace/>}/>
      <Route path="/game" element={<Navigate to="/play" replace/>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  </>;
}
