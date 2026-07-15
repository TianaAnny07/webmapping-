import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';
import MapView from './components/MapView';
import Login from './page/Login';
import Register from './page/Register';
import Dashboard from './page/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import VisitorApp from './visitor/VisitorApp';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />     
            <Route path="/carte-publique" element={<MapView />} />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <VisitorApp />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;