import { useState, useEffect } from 'react'
import { X, Menu } from 'lucide-react'
import { useLanguage } from '../tutorial/LanguageContext'

interface TocItem {
  id: string
  en: string
  ko: string
  indent?: boolean
}

const tocItems: TocItem[] = [
  { id: 'telegram-bot', en: 'Telegram Remote', ko: 'Telegram 원격 제어' },
  { id: 'telegram-create-bot', en: 'Create Bot', ko: 'Bot 만들기', indent: true },
  { id: 'telegram-setup', en: 'Setup & Start', ko: '설정 및 시작', indent: true },
  { id: 'telegram-commands', en: 'Commands', ko: '사용 가능한 명령어', indent: true },
  { id: 'telegram-tools', en: 'Tool Management', ko: 'AI 도구 관리', indent: true },
  { id: 'telegram-workflow', en: 'Workflow Examples', ko: '실전 워크플로우', indent: true },
]

export default function TelegramTutorialSidebar() {
  const { lang, t } = useLanguage()
  const [activeId, setActiveId] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const ids = tocItems.map((item) => item.id)
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    )

    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const handleClick = (id: string) => {
    setMobileOpen(false)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const navContent = (
    <nav className="space-y-0.5">
      {tocItems.map((item) => (
        <button
          key={item.id}
          onClick={() => handleClick(item.id)}
          className={`block w-full text-left text-sm py-1.5 transition-colors rounded px-3 ${
            item.indent ? 'pl-6' : ''
          } ${
            activeId === item.id
              ? 'text-accent-cyan bg-accent-cyan/10 font-medium'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {lang === 'en' ? item.en : item.ko}
        </button>
      ))}
    </nav>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 w-12 h-12 bg-accent-cyan/20 border border-accent-cyan/50 rounded-full flex items-center justify-center text-accent-cyan backdrop-blur-sm"
        aria-label="Toggle table of contents"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-40 h-full w-72 bg-bg-dark border-r border-zinc-800 p-6 pt-20 overflow-y-auto transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <h3 className="text-white font-bold text-lg mb-4">{t('Contents', '목차')}</h3>
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-[250px] flex-shrink-0">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 tutorial-sidebar-scroll">
          <h3 className="text-white font-bold text-lg mb-4 px-3">{t('Contents', '목차')}</h3>
          {navContent}
        </div>
      </aside>
    </>
  )
}
