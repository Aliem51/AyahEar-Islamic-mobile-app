import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Импортируем переводы
import enTranslation from "./locales/en/translation.json";
import ruTranslation from "./locales/ru/translation.json";
import kkTranslation from "./locales/kk/translation.json";

// Ресурсы переводов
const resources = {
  en: { translation: enTranslation },
  ru: { translation: ruTranslation },
  kk: { translation: kkTranslation },
};

// Инициализация i18next
i18next
  .use(initReactI18next)
  .init({
    resources,
    lng: "ru", // Язык по умолчанию
    fallbackLng: "en", // Fallback-язык
    interpolation: {
      escapeValue: false, // React уже экранирует значения
    },
  })
  .then(() => {
    console.log("i18next initialized with language:", i18next.language);
  });

// Функция для смены языка
export const changeLanguage = async (lng) => {
  try {
    await i18next.changeLanguage(lng);
    await AsyncStorage.setItem("appLanguage", lng);
    console.log("Language changed to:", lng);
  } catch (error) {
    console.error("Error changing language:", error);
  }
};

// Загружаем сохранённый язык при запуске приложения
export const loadLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem("appLanguage");
    console.log("Loaded language from AsyncStorage:", savedLanguage);
    if (savedLanguage) {
      await i18next.changeLanguage(savedLanguage);
    }
  } catch (error) {
    console.error("Error loading language:", error);
  }
};

export default i18next;
