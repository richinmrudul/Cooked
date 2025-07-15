import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';     
import RegisterPage from './pages/RegisterPage'; 

function App() {
  return (
    <Routes>
      <Route path="/" element={<h1>Welcome to Cooked!</h1>} /> {/* keep this for now */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      {/* add a Dashboard/Home page for logged-in users later */}
    </Routes>
  );
}

export default App;