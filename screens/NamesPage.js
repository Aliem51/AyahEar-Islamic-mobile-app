import React, { useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";
import { useLanguage } from "../LanguageContext";

// Функция загрузки базы данных из assets
const loadDatabase = async () => {
  const dbName = "names.db";
  const assetPath = Asset.fromModule(require("../assets/names.db")).uri;
  const dbPath = `${FileSystem.documentDirectory}SQLite/${dbName}`;

  const dirInfo = await FileSystem.getInfoAsync(
    `${FileSystem.documentDirectory}SQLite`
  );
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(
      `${FileSystem.documentDirectory}SQLite`,
      { intermediates: true }
    );
  }

  const fileInfo = await FileSystem.getInfoAsync(dbPath);
  if (!fileInfo.exists) {
    console.log("Копирование базы данных names.db из assets...");
    await FileSystem.downloadAsync(assetPath, dbPath);
    console.log("База данных скопирована в:", dbPath);
  } else {
    console.log("База данных уже существует в:", dbPath);
  }

  const db = SQLite.openDatabaseSync(dbName);
  console.log("База данных открыта:", db);
  return db;
};

// Функция для получения всех записей из таблицы names
const getAllNames = async (db) => {
  try {
    const result = await db.getAllAsync(
      "SELECT id, name, transliteration, transliteration_ru, transliteration_kk, name_en, name_ru, name_kk FROM names;"
    );
    console.log("Результат запроса всех имён:", result);
    return result || [];
  } catch (error) {
    console.error("Ошибка загрузки имён:", error);
    return [];
  }
};

const NamesPage = () => {
  const [names, setNames] = useState([]);
  const [error, setError] = useState(null);
  const { language, t } = useLanguage();
  const [dbSqlite, setDbSqlite] = useState(null);

  // Определяем langCode с учётом английского языка
  const langCode =
    language === "kk_text" ? "kk" : language === "en_text" ? "en" : "ru";

  // Загружаем базу данных при монтировании компонента
  useEffect(() => {
    const initialize = async () => {
      try {
        const loadedDb = await loadDatabase();
        setDbSqlite(loadedDb);

        const namesData = await getAllNames(loadedDb);
        if (namesData.length === 0) {
          setError(t("common.error") || "No data found in the database");
        } else {
          setNames(namesData);
        }
      } catch (error) {
        console.error("Ошибка инициализации:", error);
        setError(
          t("common.error") + ": " + error.message || "Initialization failed"
        );
      }
    };
    initialize();
  }, [t, language]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.numberContainer}>
        <Text style={styles.number}>{item.id}</Text>
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.transliteration}>
          {langCode === "en"
            ? item.transliteration
            : langCode === "ru"
            ? item.transliteration_ru
            : item.transliteration_kk}
        </Text>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{item.name}</Text>
        </View>
        <Text style={styles.meaning}>
          {langCode === "en"
            ? item.name_en
            : langCode === "ru"
            ? item.name_ru
            : item.name_kk}
        </Text>
      </View>
    </View>
  );

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (names.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>
          {t("common.loading") || "Loading..."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={names}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // Основной контейнер страницы
  container: {
    flex: 1, // Растягиваем на весь экран
    backgroundColor: "#0A1422", // Тёмный фон страницы
    justifyContent: "flex-start", // Контент начинается сверху
    alignItems: "left", // Выравниваем содержимое по левому краю
    paddingTop: 10, // Отступ сверху
  },
  // Стили для FlatList (список карточек)
  list: {
    paddingHorizontal: 10, // Минимальный отступ по бокам, чтобы карточки были ближе к краям
    paddingBottom: 20, // Отступ снизу для прокрутки
  },
  // Карточка для каждого имени
  card: {
    backgroundColor: "#124C79", // Фон карточки (тёмно-синий)
    borderRadius: 15, // Скругление углов
    padding: 10, // Внутренние отступы
    marginVertical: 5, // Отступ сверху и снизу между карточками
    flexDirection: "row", // Горизонтальное расположение элементов (номер слева, контент справа)
    alignItems: "center", // Центрируем элементы по вертикали
    width: "98%", // Карточка занимает почти всю ширину экрана
    alignSelf: "center", // Центрируем карточку относительно списка
  },
  // Контейнер для номера (слева)
  numberContainer: {
    marginRight: 15, // Отступ справа от номера
    justifyContent: "center", // Центрируем номер по вертикали
    alignItems: "center", // Центрируем номер по горизонтали
  },
  // Стиль для номера
  number: {
    fontSize: 18, // Размер шрифта номера
    color: "#FFFFFF", // Белый цвет текста
    fontWeight: "bold", // Жирный шрифт
    writingDirection: "ltr", // Текст горизонтально (слева направо)
  },
  // Контейнер для основного содержимого (транслитерация, имя, перевод)
  contentContainer: {
    flex: 1, // Растягиваем контейнер на оставшееся пространство
  },
  // Транслитерация (вверху)
  transliteration: {
    fontSize: 18, // Размер шрифта
    color: "#FFFFFF", // Белый цвет текста
    fontWeight: "bold", // Жирный шрифт
    marginBottom: -16, // Отступ снизу
    writingDirection: "ltr", // Текст горизонтально (слева направо)
  },
  // Контейнер для имени на арабском (справа)
  nameContainer: {
    alignItems: "flex-end", // Выравниваем имя по правому краю
  },
  // Стиль для имени на арабском
  name: {
    fontSize: 25, // Размер шрифта
    color: "#00FF00", // Зелёный цвет текста
    fontWeight: "bold", // Жирный шрифт
    writingDirection: "rtl", // Арабский текст справа налево
  },
  // Перевод (внизу)
  meaning: {
    fontSize: 16, // Размер шрифта
    color: "#D1D1D1", // Светло-серый цвет текста
    writingDirection: "ltr", // Текст горизонтально (слева направо)
  },
  // Текст загрузки
  loadingText: {
    fontSize: 16, // Размер шрифта
    color: "#FFFFFF", // Белый цвет текста
    textAlign: "center", // Центрируем текст
  },
  // Текст ошибки
  errorText: {
    fontSize: 16, // Размер шрифта
    color: "#E74C3C", // Красный цвет текста
    textAlign: "center", // Центрируем текст
  },
});

export default NamesPage;
