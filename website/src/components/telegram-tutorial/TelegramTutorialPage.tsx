import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Github, Send, BookOpen } from 'lucide-react'
import TelegramTutorialSidebar from './TelegramTutorialSidebar'
import TelegramBot from '../tutorial/sections/TelegramBot'
import { LanguageProvider, useLanguage } from '../tutorial/LanguageContext'

function LanguageToggle() {
  const { lang, setLang } = useLanguage()
  return (
    <div className="flex items-center border border-zinc-700 rounded-md overflow-hidden text-xs">
      <button
        onClick={() => setLang('en')}
        className={`px-2 py-1 font-semibold transition-colors ${
          lang === 'en'
            ? 'bg-accent-cyan/20 text-accent-cyan'
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        EN
      </button>
      <div className="w-px h-4 bg-zinc-700" />
      <button
        onClick={() => setLang('ko')}
        className={`px-2 py-1 font-semibold transition-colors ${
          lang === 'ko'
            ? 'bg-accent-cyan/20 text-accent-cyan'
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        KO
      </button>
    </div>
  )
}

function TelegramTutorialPageInner() {
  const { t } = useLanguage()
  const location = useLocation()
  const scrollTarget = (location.state as { scrollTo?: string })?.scrollTo

  useEffect(() => {
    if (scrollTarget) {
      setTimeout(() => {
        document.getElementById(scrollTarget)?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } else {
      window.scrollTo(0, 0)
    }
  }, [scrollTarget])

  return (
    <div className="min-h-screen bg-bg-dark">
      {/* Top navigation bar */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-bg-dark/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Home</span>
            </Link>
            <div className="hidden sm:block h-5 w-px bg-zinc-700" />
            <Link to="/" className="hidden sm:block">
              <span className="gradient-text font-bold text-lg">cokacdir</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-white font-semibold flex items-center gap-2">
              <Send className="w-4 h-4 text-accent-cyan" />
              <span className="hidden sm:inline">Telegram Bot Tutorial</span>
            </span>
            <LanguageToggle />
          </div>

          <a
            href="https://github.com/kstost/cokacdir"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <Github className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">GitHub</span>
          </a>
        </div>
      </header>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-16 flex gap-8">
        <TelegramTutorialSidebar />

        {/* Main content area */}
        <main className="flex-1 min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Page title */}
            <div className="mb-12">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4">
                {t('Telegram Bot Tutorial', '텔레그램 봇 튜토리얼')}
              </h1>
              <p className="text-lg text-zinc-400 leading-relaxed max-w-3xl">
                {t(
                  'Learn how to set up and use the cokacdir Telegram bot for remote AI agent control. Create a bot, configure it, and manage your server from anywhere.',
                  'cokacdir 텔레그램 봇을 설정하고 원격으로 AI 에이전트를 제어하는 방법을 알아봅니다. 봇 생성, 설정, 그리고 어디서든 서버를 관리하세요.'
                )}
              </p>
            </div>

            <TelegramBot />

            {/* Cross-link banner to file manager tutorial */}
            <div className="mt-12 p-5 rounded-xl border border-accent-cyan/20 bg-accent-cyan/5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-white font-semibold text-lg mb-1 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-accent-cyan" />
                    {t('File Manager Tutorial', '파일 관리자 튜토리얼')}
                  </h3>
                  <p className="text-zinc-400 text-sm">
                    {t(
                      'Learn the full cokacdir file manager — navigation, panels, file operations, editor, Git, AI, and more.',
                      'cokacdir 파일 관리자의 모든 기능을 배워보세요 — 탐색, 패널, 파일 작업, 에디터, Git, AI 등.'
                    )}
                  </p>
                </div>
                <Link
                  to="/tutorial"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan font-semibold text-sm hover:bg-accent-cyan/20 transition-colors whitespace-nowrap"
                >
                  <BookOpen className="w-4 h-4" />
                  {t('Go to Tutorial', '튜토리얼 보기')}
                </Link>
              </div>
            </div>

            {/* Bottom navigation */}
            <div className="mt-16 pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 text-zinc-400 hover:text-accent-cyan transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('Back to Home', '홈으로 돌아가기')}
              </Link>
              <a
                href="https://github.com/kstost/cokacdir"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
              >
                <Github className="w-4 h-4" />
                Star on GitHub
              </a>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  )
}

export default function TelegramTutorialPage() {
  return (
    <LanguageProvider>
      <TelegramTutorialPageInner />
    </LanguageProvider>
  )
}
