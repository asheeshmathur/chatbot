import {BrowserRouter, Routes, Route} from "react-router-dom"
import MsgPage from "./MsgPage";

function App() {
  return (
    <BrowserRouter>
        <div>
          <Routes>
            <Route path="/" element={<MsgPage />}></Route>
          </Routes>
    </div>
    </BrowserRouter>
    
  );
}

export default App;
