import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import TutorialPage from './components/tutorial/TutorialPage'
import EC2Page from './components/ec2/EC2Page'
import MacOSPage from './components/macos/MacOSPage'
import WindowsPage from './components/windows/WindowsPage'
import WorkflowsPage from './components/workflows/WorkflowsPage'
import TelegramTutorialPage from './components/telegram-tutorial/TelegramTutorialPage'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/tutorial" element={<TutorialPage />} />
        <Route path="/telegram-tutorial" element={<TelegramTutorialPage />} />
        <Route path="/ec2" element={<EC2Page />} />
        <Route path="/macos" element={<MacOSPage />} />
        <Route path="/windows" element={<WindowsPage />} />
        <Route path="/workflows" element={<WorkflowsPage />} />
      </Routes>
    </>
  )
}

export default App
