import {Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Dashboard from './pages/Dashboard/Dashboard'
import Inbox from './pages/Inbox/Inbox'
import Settings from './pages/Settings/Settings'
import Layout from './components/Layout/Layout'

// Simple check. Is there a token in localStorage?
const isAuthenticated = ()=> !!localStorage.getItem('token')

// Protects routes. If not logged in, sent to login paged
const PrivateRoute = ({ children })=>{
  return isAuthenticated() ? children : <Navigate to="/login"/>
}

function App(){
  return (
    <Routes>
      {/* Public routes */}
      <Route path='/login' element={<Login/>}/>
      <Route path='/register' element={<Register/>}/>

      {/* Protected routes. Wrapped in Layout */}
      <Route path='/' element={
        <PrivateRoute>
          <Layout/>
        </PrivateRoute>
      }>
        <Route index element={<Dashboard/>}/>
        <Route path='inbox' element={<Inbox/>}/>
        <Route path='settings' element={<Settings/>}/>
      </Route>
    </Routes>
  )
}

export default App