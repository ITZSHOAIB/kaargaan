import { Suspense, useEffect } from "react";
import { LazyMotion, MotionConfig } from "motion/react";
import { Navigate, Route, Routes } from "react-router-dom";
import { lazyScreen } from "./lib/lazyRoute";
import { HomePage } from "./pages/HomePage";
import { UpdateBanner } from "./ui/UpdateBanner";

const CardPage = lazyScreen(() => import("./pages/card/CardPage").then((m) => m.CardPage));
const StagePage = lazyScreen(() => import("./pages/stage/StagePage").then((m) => m.StagePage));
const PlayPage = lazyScreen(() => import("./pages/play/PlayPage").then((m) => m.PlayPage));
const loadMotion = () => import("./lib/motionFeatures").then((m) => m.default);

/** Fetch the other screens once the phone is idle, so a tap never waits on the network. */
function usePreloadScreens() {
  useEffect(() => {
    const preload = () => { for (const screen of [StagePage, CardPage, PlayPage]) void screen.preload(); };
    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(preload, { timeout: 3000 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(preload, 1500);
    return () => clearTimeout(id);
  }, []);
}

export default function App() {
  usePreloadScreens();
  return <LazyMotion features={loadMotion} strict>
    <MotionConfig reducedMotion="user">
      <UpdateBanner />
      <Suspense fallback={<div className="kg-loading" aria-busy="true" />}>
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
      </Suspense>
    </MotionConfig>
  </LazyMotion>;
}
