import { Link } from 'react-router-dom'
import { Send } from 'lucide-react'
import { useLanguage } from './LanguageContext'
import GettingStarted from './sections/GettingStarted'
import InterfaceOverview from './sections/InterfaceOverview'
import BasicNavigation from './sections/BasicNavigation'
import PanelSystem from './sections/PanelSystem'
import FileSelection from './sections/FileSelection'
import SortingFiltering from './sections/SortingFiltering'
import FileOperations from './sections/FileOperations'
import SearchFind from './sections/SearchFind'
import ViewerEditor from './sections/ViewerEditor'
import DiffCompare from './sections/DiffCompare'
import GitIntegration from './sections/GitIntegration'
import AICommands from './sections/AICommands'
import ProcessManager from './sections/ProcessManager'
import ImageViewer from './sections/ImageViewer'
import SettingsConfig from './sections/SettingsConfig'
import RemoteConnections from './sections/RemoteConnections'
import BookmarksHelp from './sections/BookmarksHelp'
import KeyboardReference from './sections/KeyboardReference'

function TelegramCrossLink() {
  const { t } = useLanguage()
  return (
    <div className="my-12 p-5 rounded-xl border border-accent-cyan/20 bg-accent-cyan/5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-white font-semibold text-lg mb-1 flex items-center gap-2">
            <Send className="w-5 h-5 text-accent-cyan" />
            {t('Telegram Bot Tutorial', '텔레그램 봇 튜토리얼')}
          </h3>
          <p className="text-zinc-400 text-sm">
            {t(
              'Set up and control your AI agent remotely via Telegram — create a bot, configure commands, and manage your server from your phone.',
              '텔레그램으로 AI 에이전트를 원격 제어하세요 — 봇 생성, 명령어 설정, 폰에서 서버 관리까지.'
            )}
          </p>
        </div>
        <Link
          to="/telegram-tutorial"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan font-semibold text-sm hover:bg-accent-cyan/20 transition-colors whitespace-nowrap"
        >
          <Send className="w-4 h-4" />
          {t('Bot Tutorial', '봇 튜토리얼')}
        </Link>
      </div>
    </div>
  )
}

export default function TutorialContent() {
  return (
    <div>
      <GettingStarted />
      <InterfaceOverview />
      <BasicNavigation />
      <PanelSystem />
      <FileSelection />
      <SortingFiltering />
      <FileOperations />
      <SearchFind />
      <ViewerEditor />
      <DiffCompare />
      <GitIntegration />
      <AICommands />
      <ProcessManager />
      <ImageViewer />
      <SettingsConfig />
      <RemoteConnections />
      <TelegramCrossLink />
      <BookmarksHelp />
      <KeyboardReference />
    </div>
  )
}
