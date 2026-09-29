import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Alert,
} from "react-native";
import BottomMenu from "./BottomMenu";
import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";
import { auth, firestore } from "../firebaseConfig";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
} from "@react-native-firebase/firestore";
import { useLanguage } from "../LanguageContext"; // Импортируем хук для переводов

// Логирование импорта firestore для отладки
console.log("Imported firestore in ZikrDetail.js:", firestore);

// Функция загрузки базы данных из assets
const loadDatabase = async () => {
  const dbName = "zikrs.db";
  const assetPath = Asset.fromModule(require("../assets/zikrs.db")).uri;
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
    console.log("Копирование базы данных zikrs.db из assets...");
    await FileSystem.downloadAsync(assetPath, dbPath);
    console.log("База данных скопирована в:", dbPath);
  } else {
    console.log("База данных уже существует в:", dbPath);
  }

  const db = SQLite.openDatabaseSync(dbName);
  console.log("База данных открыта:", db);
  return db;
};

// Функция для получения зикра по ID
const getZikrById = async (db, zikrId, t) => {
  try {
    const result = await db.getFirstAsync(
      "SELECT id, title, transcript, arabic, count, translate FROM zikrs WHERE id = ?;",
      [zikrId]
    );
    console.log("Результат запроса зикра с id", zikrId, ":", result);
    return (
      result || {
        id: 0,
        title: t("ZikrScreen.notFound"),
        transcript: "",
        arabic: "",
        count: 0,
        translate: t("ZikrScreen.notFoundMessage"),
      }
    );
  } catch (error) {
    console.error("Ошибка загрузки зикра:", error);
    return {
      id: 0,
      title: t("ZikrScreen.error"),
      transcript: "",
      arabic: "",
      count: 0,
      translate: t("ZikrScreen.errorMessage"),
    };
  }
};

const ZikrDetail = ({ route, navigation }) => {
  const { zikrId } = route.params;
  const { t } = useLanguage(); // Получаем функцию перевода
  const [zikr, setZikr] = useState(null);
  const [counter, setCounter] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [dbSqlite, setDbSqlite] = useState(null);
  const user = auth.currentUser;

  // Загружаем базу и данные из Firestore при монтировании компонента
  useEffect(() => {
    const initialize = async () => {
      try {
        // Загружаем локальную базу данных SQLite
        const loadedDb = await loadDatabase();
        setDbSqlite(loadedDb);
        const zikrData = await getZikrById(loadedDb, zikrId, t);
        setZikr(zikrData);

        // Проверяем, авторизован ли пользователь
        if (!user) {
          Alert.alert(t("common.error"), t("ZikrScreen.authError"));
          return;
        }

        // Проверяем, инициализирован ли Firestore
        if (!firestore) {
          console.error("Firestore instance is undefined in useEffect");
          Alert.alert(t("common.error"), t("ZikrScreen.firestoreError"));
          return;
        }

        // Логируем Firestore instance для отладки
        console.log("Firestore instance in useEffect:", firestore);

        // Загружаем данные из Firestore
        const userZikrRef = doc(
          firestore,
          "users",
          user.uid,
          "zikrs",
          String(zikrId)
        );
        const userZikrDoc = await getDoc(userZikrRef);

        // Проверяем, существует ли документ
        if (userZikrDoc.exists) {
          const data = userZikrDoc.data();
          setTotalClicks(data.totalClicks || 0);
        } else {
          // Если данных нет, инициализируем документ
          await setDoc(userZikrRef, {
            totalClicks: 0,
          });
          setTotalClicks(0);
        }
      } catch (error) {
        console.error("Ошибка инициализации:", error);
        Alert.alert(
          t("common.error"),
          t("ZikrScreen.loadError") + error.message
        );
      }
    };
    initialize();
  }, [zikrId, t]); // Добавляем t в зависимости, чтобы обновлять переводы

  // Обработка нажатия на кнопку счётчика
  const handlePress = async () => {
    setCounter((prevCount) => {
      const newCount = prevCount + 1;
      if (zikr && newCount % zikr.count === 0) {
        Vibration.vibrate(1100);
      }
      return newCount;
    });

    // Обновляем общее количество нажатий
    const newTotalClicks = totalClicks + 1;
    setTotalClicks(newTotalClicks);

    // Сохраняем общее количество нажатий в Firestore
    if (user && firestore) {
      const userZikrRef = doc(
        firestore,
        "users",
        user.uid,
        "zikrs",
        String(zikrId)
      );
      try {
        await updateDoc(userZikrRef, {
          totalClicks: newTotalClicks,
        });
      } catch (error) {
        console.error("Ошибка сохранения количества нажатий:", error);
        Alert.alert(
          t("common.error"),
          t("ZikrScreen.saveError") + error.message
        );
      }
    }
  };

  // Сброс текущего счётчика
  const resetCounter = () => setCounter(0);

  if (!zikr) {
    return (
      <View style={styles.container}>
        <Text style={styles.translation}>{t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.arabic}>{zikr.arabic}</Text>
      <Text style={styles.transcript}>{zikr.transcript}</Text>
      <Text style={styles.translation}>{zikr.translate}</Text>

      {/* Общее количество нажатий */}
      <Text style={styles.totalClicks}>
        {t("ZikrScreen.totalClicks")} {totalClicks}
      </Text>

      {/* Счётчик в TouchableOpacity, чтобы вся зона была кликабельной */}
      <TouchableOpacity style={styles.counterZone} onPress={handlePress}>
        <Text style={styles.counter}>{counter}</Text>
        <Text style={styles.total}>/{zikr.count}</Text>
      </TouchableOpacity>

      {/* Кнопка сброса */}
      <TouchableOpacity style={styles.resetButton} onPress={resetCounter}>
        <Text style={styles.resetText}>{t("ZikrScreen.reset")}</Text>
      </TouchableOpacity>

      {/* Нижнее меню */}
      <BottomMenu navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1422",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 50,
  },
  arabic: {
    fontSize: 32,
    color: "#00FF00",
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  transcript: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "bold",
    marginBottom: 5,
    paddingHorizontal: 20,
  },
  translation: {
    fontSize: 16,
    color: "#D1D1D1",
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  totalClicks: {
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 20,
  },
  counterZone: {
    position: "absolute",
    bottom: 50,
    width: "100%",
    height: 320,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#124C79",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  counter: {
    fontSize: 48,
    color: "#FFFFFF",
    fontWeight: "bold",
    marginRight: 10,
  },
  total: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  resetButton: {
    padding: 10,
    backgroundColor: "#E74C3C",
    borderRadius: 5,
  },
  resetText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
});

export default ZikrDetail;
