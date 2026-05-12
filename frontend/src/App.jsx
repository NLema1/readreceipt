import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Feed from "./pages/Feed";
import Detail from "./pages/Detail";
import Search from "./pages/Search";
import Stats from "./pages/Stats";
import About from "./pages/About";
import Takedown from "./pages/Takedown";
import Privacy from "./pages/Privacy";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/article/:id" element={<Detail />} />
          <Route path="/search" element={<Search />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/about" element={<About />} />
          <Route path="/takedown" element={<Takedown />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/method" element={<Navigate to="/#method" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
