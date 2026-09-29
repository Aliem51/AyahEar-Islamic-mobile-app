import * as SQLite from "expo-sqlite";

// Открываем базу данных синхронно
const db = SQLite.openDatabaseSync("quran.db");

// Проверяем, что таблицы существуют
export const checkDatabase = async () => {
  try {
    const result = await db.execAsync([
      {
        sql: "SELECT name FROM sqlite_master WHERE type='table';",
        args: [],
      },
    ]);
  } catch (error) {
    console.error("Ошибка проверки БД:", error);
  }
};

// Получаем список сур
const getSurahs = async (db) => {
  try {
    const result = await db.execAsync([
      {
        sql: "SELECT number, englishName FROM surahs;",
        args: [],
      },
    ]);
    return result[0].rows.map((row) => ({
      number: row.number,
      englishName: row.englishName,
      ayahs: [],
    }));
  } catch (error) {
    console.error("Ошибка загрузки сур:", error);
    return [];
  }
};

// Получаем аяты по номеру суры
export const getAyahsBySurah = async (surahId) => {
  try {
    const result = await db.execAsync([
      {
        sql: "SELECT numberInSurah, text, en_text, ru_text FROM ayah WHERE surah_number = ?;",
        args: [surahId],
      },
    ]);
    return result[0].rows; // Возвращаем массив аятов
  } catch (error) {
    throw error; // Пробрасываем ошибку для обработки в компоненте
  }
};

// Инициализация базы данных (если нужно создать таблицы)
export const initDatabase = async () => {
  try {
    await db.execAsync([
      {
        sql: "CREATE TABLE IF NOT EXISTS surah (id INTEGER PRIMARY KEY, name TEXT);",
        args: [],
      },
      {
        sql: "CREATE TABLE IF NOT EXISTS ayah (id INTEGER PRIMARY KEY, surah_number INTEGER, text TEXT, translation TEXT);",
        args: [],
      },
    ]);
    console.log("Таблицы созданы или уже существуют");
  } catch (error) {
    console.error("Ошибка инициализации БД:", error);
  }
};
