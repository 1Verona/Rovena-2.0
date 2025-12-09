import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Login } from './pages/Login';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<Login onAuthSuccess={() => console.log('success')} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
