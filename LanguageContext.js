import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18next from "./i18n";
import { useTranslation } from "react-i18next";

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(i18next.language || "ru");
  const { t, i18n } = useTranslation();

  // Синхронизация языка с i18next
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem("appLanguage");
        if (savedLanguage && savedLanguage !== language) {
          setLanguage(savedLanguage);
          await i18next.changeLanguage(savedLanguage);
        }
      } catch (error) {
        console.error("Error loading language:", error);
      }
    };
    loadLanguage();
  }, []);

  // Подписка на изменение языка в i18next
  useEffect(() => {
    const onLanguageChange = (lng) => {
      setLanguage(lng);
      AsyncStorage.setItem("appLanguage", lng);
    };
    i18next.on("languageChanged", onLanguageChange);
    return () => {
      i18next.off("languageChanged", onLanguageChange);
    };
  }, []);

  // Функция для смены языка
  const handleSetLanguage = async (newLanguage) => {
    try {
      await i18next.changeLanguage(newLanguage);
      setLanguage(newLanguage);
      await AsyncStorage.setItem("appLanguage", newLanguage);
    } catch (error) {
      console.error("Error setting language:", error);
    }
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage: handleSetLanguage, t }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
