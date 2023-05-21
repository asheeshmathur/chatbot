import {BrowserRouter, Routes, Route} from "react-router-dom"
import Home from "./components/Home"
import ChatPage from "./components/ChatPage";

function App() {
  return (
    <BrowserRouter>
        <div>
          <Routes>
            <Route path="/chat" element={<Home/>}></Route>
            <Route path="/" element={<ChatPage />}></Route>
          </Routes>
    </div>
    </BrowserRouter>
    
  );
}

export default App;
