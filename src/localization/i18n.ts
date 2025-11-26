import { I18n } from 'i18n-js';
import { LocaleType } from '../database/schemas/Settings';

import en from './translations/en';
import zh from './translations/zh';
import ja from './translations/ja';
import ko from './translations/ko';
import de from './translations/de';
import fr from './translations/fr';
import es from './translations/es';
import ptBR from './translations/pt-BR';
import ar from './translations/ar';
import ru from './translations/ru';
import it from './translations/it';
import nl from './translations/nl';
import tr from './translations/tr';
import th from './translations/th';
import vi from './translations/vi';
import id from './translations/id';
import pl from './translations/pl';
import uk from './translations/uk';
import hi from './translations/hi';
import he from './translations/he';
import sv from './translations/sv';
import no from './translations/no';
import da from './translations/da';
import fi from './translations/fi';
import cs from './translations/cs';
import hu from './translations/hu';
import ro from './translations/ro';
import el from './translations/el';
import ms from './translations/ms';
import fil from './translations/fil';

const i18n = new I18n({
  en,
  zh,
  ja,
  ko,
  de,
  fr,
  es,
  'pt-BR': ptBR,
  ar,
  ru,
  it,
  nl,
  tr,
  th,
  vi,
  id,
  pl,
  uk,
  hi,
  he,
  sv,
  no,
  da,
  fi,
  cs,
  hu,
  ro,
  el,
  ms,
  fil,
});

i18n.defaultLocale = 'en';
i18n.locale = 'en';
i18n.enableFallback = true;

export const setI18nLocale = (locale: LocaleType) => {
  i18n.locale = locale;
};

export const getI18nLocale = (): LocaleType => {
  return i18n.locale as LocaleType;
};

export const t = (key: string, options?: object): string => {
  return i18n.t(key, options);
};

export const languageFlags: Record<LocaleType, string> = {
  en: '🇬🇧',
  zh: '🇨🇳',
  ja: '🇯🇵',
  ko: '🇰🇷',
  de: '🇩🇪',
  fr: '🇫🇷',
  es: '🇪🇸',
  'pt-BR': '🇧🇷',
  ar: '🇸🇦',
  ru: '🇷🇺',
  it: '🇮🇹',
  nl: '🇳🇱',
  tr: '🇹🇷',
  th: '🇹🇭',
  vi: '🇻🇳',
  id: '🇮🇩',
  pl: '🇵🇱',
  uk: '🇺🇦',
  hi: '🇮🇳',
  he: '🇮🇱',
  sv: '🇸🇪',
  no: '🇳🇴',
  da: '🇩🇰',
  fi: '🇫🇮',
  cs: '🇨🇿',
  hu: '🇭🇺',
  ro: '🇷🇴',
  el: '🇬🇷',
  ms: '🇲🇾',
  fil: '🇵🇭',
};

export const languageNames: Record<LocaleType, string> = {
  en: 'English',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  'pt-BR': 'Português (Brasil)',
  ar: 'العربية',
  ru: 'Русский',
  it: 'Italiano',
  nl: 'Nederlands',
  tr: 'Türkçe',
  th: 'ไทย',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
  pl: 'Polski',
  uk: 'Українська',
  hi: 'हिन्दी',
  he: 'עברית',
  sv: 'Svenska',
  no: 'Norsk',
  da: 'Dansk',
  fi: 'Suomi',
  cs: 'Čeština',
  hu: 'Magyar',
  ro: 'Română',
  el: 'Ελληνικά',
  ms: 'Bahasa Melayu',
  fil: 'Filipino',
};

export default i18n;
