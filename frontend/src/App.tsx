import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<h1>Welcome to Cooked!</h1>} />
        {/*add more routes here later */}
      </Routes>
    </Router>
  );
}

export default App;