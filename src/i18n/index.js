import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './en.json'
import pt from './pt.json'

const savedLanguage = globalThis.localStorage?.getItem('vallle_language')

i18n.use(initReactI18next).init({
  resources: {
    pt: { translation: pt },
    en: { translation: en },
  },
  lng: savedLanguage || 'pt',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
