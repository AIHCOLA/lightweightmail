import { Plus, Mail, Moon, Sun, Languages } from 'lucide-react';
import { useI18n } from '../i18n';

interface HeaderProps {
  onCreateAddress: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export function Header({ onCreateAddress, darkMode, onToggleDarkMode }: HeaderProps) {
  const { t, lang, toggleLang } = useI18n();

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between px-4 sm:px-6 h-14">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <Mail size={18} className="text-white" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100">
              {t.app_title}
            </h1>
            <span className="hidden sm:inline text-[11px] text-gray-400 dark:text-gray-500 font-normal">
              {t.app_subtitle}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {/* Language toggle */}
          <button
            onClick={toggleLang}
            className="btn-ghost p-2 text-xs font-bold"
            title={lang === 'zh' ? t.switch_to_english : t.switch_to_chinese}
          >
            <Languages size={18} />
            <span className="hidden sm:inline ml-0.5">{lang === 'zh' ? 'EN' : '中'}</span>
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={onToggleDarkMode}
            className="btn-ghost p-2"
            title={darkMode ? t.switch_to_light_mode : t.switch_to_dark_mode}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button onClick={onCreateAddress} className="btn-primary text-sm gap-1.5">
            <Plus size={16} />
            <span className="hidden sm:inline">{t.new_address}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
