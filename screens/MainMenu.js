import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
  FlatList,
  ImageBackground,
  ScrollView,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import BottomMenu from "./BottomMenu";
import { LinearGradient } from "expo-linear-gradient";
import HijriDate from "hijri-date/lib/safe";
import PrayTimes from "../PrayTimes";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Dimensions } from "react-native";
import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";
import { auth, firestore } from "../firebaseConfig";
import fajrCard from "../icons/fajrCard.png";
import zuhrCard from "../icons/zuhrCard.png";
import asrCard from "../icons/asrCard.png";
import maghribCard from "../icons/maghribCard.png";
import ishaCard from "../icons/ishaCard.png";
import image2 from "../icons/sun.png";
import magrib from "../icons/magrib.png";
import fajr from "../icons/fajr.png";
import zuhr from "../icons/zuhr.png";
import asha from "../icons/asha.png";
import { useLanguage } from "../LanguageContext"; // Импортируем хук для переводов

// Функция загрузки базы данных из assets
const loadDatabase = async () => {
  const dbName = "quran.db";
  const assetPath = Asset.fromModule(require("../assets/quran.db")).uri;
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
    console.log("Копирование базы данных quran.db из assets...");
    await FileSystem.downloadAsync(assetPath, dbPath);
    console.log("База данных скопирована в:", dbPath);
  } else {
    console.log("База данных уже существует в:", dbPath);
  }

  const db = SQLite.openDatabaseSync(dbName);
  console.log("База данных открыта:", db);
  return db;
};

// Функция для получения списка сур из базы
const getSurahs = async (db) => {
  try {
    const surahs = await db.getAllAsync(
      "SELECT number, englishName, name FROM surahs;"
    );
    return surahs;
  } catch (error) {
    console.error("Ошибка загрузки сур:", error);
    return [];
  }
};

// Функция для перехода к последней прочитанной суре
const goToLastReadSurah = (navigation, lastReadSurah, t) => {
  if (lastReadSurah) {
    navigation.navigate("Quran", { surahName: lastReadSurah });
  } else {
    Alert.alert(t("common.error"), t("MainMenu.notStartedReading"));
  }
};

// Функция для получения арабского имени суры по её английскому названию
const getArabicNameByEnglishName = (surahs, englishName) => {
  const surah = surahs.find((s) => s.englishName === englishName);
  return surah ? surah.name : "";
};

// Сохранение данных времени молитв в локальное хранилище
const saveDataToCache = async (times) => {
  try {
    await AsyncStorage.setItem("@prayer_times_almaty", JSON.stringify(times));
  } catch (error) {
    console.error("Error saving data to cache:", error);
  }
};

// Загрузка данных времени молитв из локального хранилища
const loadDataFromCache = async () => {
  try {
    const cachedData = await AsyncStorage.getItem("@prayer_times_almaty");
    if (cachedData !== null) {
      return JSON.parse(cachedData);
    }
    return null;
  } catch (error) {
    console.error("Error loading data from cache:", error);
    return null;
  }
};

// Функция для добавления минут к строке времени
const addMinutesToTimeString = (timeString, minutesToAdd) => {
  if (!timeString) return "";
  const [hours, minutes] = timeString.split(":").map(Number);
  let date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes + minutesToAdd);
  let hh = String(date.getHours()).padStart(2, "0");
  let mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

// Определение следующей молитвы
const getNextPrayer = (prayerTimes, t) => {
  const now = new Date();
  const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

  const prayerNamesInOrder = [
    t("MainMenu.fajr"),
    t("MainMenu.dhuhr"),
    t("MainMenu.asr"),
    t("MainMenu.maghrib"),
    t("MainMenu.isha"),
  ];
  const prayerNamesMapping = {
    [t("MainMenu.fajr")]: "fajr",
    [t("MainMenu.dhuhr")]: "dhuhr",
    [t("MainMenu.asr")]: "asr",
    [t("MainMenu.maghrib")]: "maghrib",
    [t("MainMenu.isha")]: "isha",
  };

  if (
    !prayerTimes ||
    Object.values(prayerTimes).every((time) => time === "00:00")
  ) {
    console.log(
      "Ошибка: prayerTimes не содержит корректных данных",
      prayerTimes
    );
    return { name: t("MainMenu.fajr"), time: { hours: 0, minutes: 0 } };
  }

  for (let i = 0; i < prayerNamesInOrder.length; i++) {
    const name = prayerNamesInOrder[i];
    let timeString = prayerTimes[prayerNamesMapping[name]];

    if (!timeString || timeString === "00:00") {
      console.log(`Время для ${name} не определено:`, timeString);
      continue;
    }

    if (name === t("MainMenu.asr")) {
      timeString = addMinutesToTimeString(timeString, 50);
    }

    const [hour, minute] = timeString.split(":").map(Number);
    const prayerTimeInMinutes = hour * 60 + minute;

    if (currentTimeInMinutes < prayerTimeInMinutes) {
      const remainingTime = prayerTimeInMinutes - currentTimeInMinutes;
      const hoursRemaining = Math.floor(remainingTime / 60);
      const minutesRemaining = remainingTime % 60;
      return {
        name: name,
        time: { hours: hoursRemaining, minutes: minutesRemaining },
      };
    }
  }

  let fajrTimeString = prayerTimes[prayerNamesMapping[t("MainMenu.fajr")]];
  if (!fajrTimeString || fajrTimeString === "00:00") {
    console.log("Время для Фаджр не определено:", fajrTimeString);
    return { name: t("MainMenu.fajr"), time: { hours: 0, minutes: 0 } };
  }

  const [fajrHour, fajrMinute] = fajrTimeString.split(":").map(Number);
  const fajrTimeInMinutes = fajrHour * 60 + fajrMinute;
  const minutesUntilMidnight = 1440 - currentTimeInMinutes;
  const minutesFromMidnightToFajr = fajrTimeInMinutes;
  const remainingTime = minutesUntilMidnight + minutesFromMidnightToFajr;
  const hoursRemaining = Math.floor(remainingTime / 60);
  const minutesRemaining = remainingTime % 60;
  return {
    name: t("MainMenu.fajr"),
    time: { hours: hoursRemaining, minutes: minutesRemaining },
  };
};

// Сохранение последней суры в Firestore
const saveLastReadSurahToFirestore = async (surahName) => {
  const user = auth.currentUser;
  if (user) {
    try {
      await firestore
        .collection("users")
        .doc(user.uid)
        .set({ lastReadSurah: surahName }, { merge: true });
      console.log("Последняя сура сохранена в Firestore:", surahName);
    } catch (error) {
      console.error("Ошибка сохранения в Firestore:", error);
    }
  }
};

// Сохранение последней суры в кэш
const saveLastReadSurahToCache = async (surahName) => {
  try {
    await AsyncStorage.setItem("LAST_OPENED_SURAH", surahName);
    console.log("Последняя сура сохранена в кэш:", surahName);
  } catch (error) {
    console.error("Ошибка сохранения в кэш:", error);
  }
};

// Очистка кэша при смене аккаунта
const clearLastReadSurahCache = async () => {
  try {
    await AsyncStorage.removeItem("LAST_OPENED_SURAH");
    console.log("Кэш последней суры очищен");
  } catch (error) {
    console.error("Ошибка очистки кэша:", error);
  }
};

// Получение последней суры из Firestore или кэша
const getLastReadSurah = async (
  setLastReadSurah,
  setLastReadArabicSurah,
  surahs
) => {
  try {
    const user = auth.currentUser;
    let surahName;

    if (user) {
      try {
        const docSnap = await firestore.collection("users").doc(user.uid).get();
        if (docSnap.exists && docSnap.data().lastReadSurah) {
          surahName = docSnap.data().lastReadSurah;
          console.log("Последняя сура загружена из Firestore:", surahName);
          await saveLastReadSurahToCache(surahName);
        }
      } catch (error) {
        console.error("Ошибка загрузки из Firestore, берём из кэша:", error);
      }
    }

    if (!surahName) {
      surahName = await AsyncStorage.getItem("LAST_OPENED_SURAH");
      console.log("Последняя сура загружена из кэша:", surahName);
    }

    if (surahName && surahs.length > 0) {
      const arabicName = getArabicNameByEnglishName(surahs, surahName);
      setLastReadSurah(surahName);
      setLastReadArabicSurah(arabicName);
    } else {
      setLastReadSurah("");
      setLastReadArabicSurah("");
    }
  } catch (error) {
    console.error("Ошибка при получении последней прочитанной суры:", error);
  }
};

// Компонент для звёздного фона
const StarryBackground = () => {
  const stars = Array.from({ length: 50 }).map((_, index) => {
    const size = Math.random() * 3 + 1;
    const left = Math.random() * 100;
    const top = Math.random() * 100;
    return (
      <View
        key={index}
        style={{
          position: "absolute",
          width: size,
          height: size,
          backgroundColor: "white",
          borderRadius: size / 2,
          left: `${left}%`,
          top: `${top}%`,
          opacity: Math.random() * 0.7 + 0.3,
        }}
      />
    );
  });

  return (
    <View style={{ position: "absolute", width: "100%", height: "100%" }}>
      {stars}
    </View>
  );
};

// Главный компонент
const MainMenu = () => {
  const { t } = useLanguage(); // Получаем функцию перевода
  const navigation = useNavigation();
  const [prayerTimes, setPrayerTimes] = useState({});
  const [nextPrayer, setNextPrayer] = useState({
    name: "",
    time: { hours: 0, minutes: 0 },
  });
  const [intervalId, setIntervalId] = useState(null);
  const [lastReadSurah, setLastReadSurah] = useState("");
  const [lastReadArabicSurah, setLastReadArabicSurah] = useState("");
  const [surahs, setSurahs] = useState([]);
  const [db, setDb] = useState(null);
  const [duas, setDuas] = useState([]);

  const screenHeight = Dimensions.get("window").height;
  const screenWidth = Dimensions.get("window").width;
  const squareWidth = screenWidth / 2 - 20;
  const styles = getStyles(screenHeight, squareWidth);

  const ALMATY_COORDS = [43.25, 76.95, 700];
  const ALMATY_TIMEZONE = 5;
  const ALMATY_DST = 0;

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        const loadedDb = await loadDatabase();
        setDb(loadedDb);
        const surahsData = await getSurahs(loadedDb);
        setSurahs(surahsData);
      } catch (error) {
        console.error("Ошибка инициализации базы данных:", error);
      }
    };
    initializeDatabase();
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const subscriber = firestore
      .collection("duas")
      .where("userId", "==", user.uid)
      .onSnapshot(
        (querySnapshot) => {
          const duaList = [];
          querySnapshot.forEach((doc) => {
            duaList.push({ id: doc.id, ...doc.data() });
          });
          setDuas(duaList);
        },
        (error) => {
          console.error("Ошибка загрузки дуа:", error);
        }
      );

    return () => subscriber();
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log("Пользователь вошёл:", user.uid);
        getLastReadSurah(setLastReadSurah, setLastReadArabicSurah, surahs);
      } else {
        console.log("Пользователь вышел");
        clearLastReadSurahCache();
        setLastReadSurah("");
        setLastReadArabicSurah("");
      }
    });

    return () => unsubscribe();
  }, [surahs]);

  useFocusEffect(
    React.useCallback(() => {
      getLastReadSurah(setLastReadSurah, setLastReadArabicSurah, surahs);
    }, [surahs])
  );

  useEffect(() => {
    const fetchPrayerTimes = async () => {
      try {
        const prayTimes = new PrayTimes("Makkah");
        const date = new Date();
        prayTimes.tune({
          fajr: 21,
          sunrise: 0,
          dhuhr: 3,
          asr: 9,
          maghrib: -3,
          isha: -14,
        });
        const times = prayTimes.getTimes(
          date,
          ALMATY_COORDS,
          ALMATY_TIMEZONE,
          ALMATY_DST,
          "24h"
        );
        console.log("Prayer times:", times);
        setPrayerTimes(times);
        await saveDataToCache(times);
        const nextPrayerObj = getNextPrayer(times, t);
        setNextPrayer(nextPrayerObj);

        if (intervalId) clearInterval(intervalId);
        const id = setInterval(() => {
          const updatedPrayer = getNextPrayer(times, t);
          setNextPrayer(updatedPrayer);
        }, 60000);
        setIntervalId(id);
      } catch (error) {
        console.error("Ошибка при получении времени намаза для Алматы:", error);
        setPrayerTimes({
          fajr: "00:00",
          dhuhr: "00:00",
          asr: "00:00",
          maghrib: "00:00",
          isha: "00:00",
        });
      }
    };

    fetchPrayerTimes();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [t]); // Добавляем t в зависимости, чтобы функция getNextPrayer обновлялась при смене языка

  const prayerNames = [
    t("MainMenu.fajr"),
    t("MainMenu.dhuhr"),
    t("MainMenu.asr"),
    t("MainMenu.maghrib"),
    t("MainMenu.isha"),
  ];
  const prayerNamesMapping = {
    [t("MainMenu.fajr")]: "fajr",
    [t("MainMenu.dhuhr")]: "dhuhr",
    [t("MainMenu.asr")]: "asr",
    [t("MainMenu.maghrib")]: "maghrib",
    [t("MainMenu.isha")]: "isha",
  };

  const currentHijriDate = new HijriDate();
  const adjustedHijriDate = new HijriDate(
    currentHijriDate.getTime() + 10 * 24 * 60 * 60 * 1000
  );
  const monthNamesInRussian = [
    "Мухаррам",
    "Сафар",
    "Раби’ аль-авваль",
    "Раби’ ас-саний",
    "Джумада аль-авваль",
    "Джумада ас-саний",
    "Раджаб",
    "Шаабан",
    "Рамадан",
    "Шавваль",
    "Дхуль-Каада",
    "Дхуль-Хиджжа",
  ];
  const monthNamesInEnglish = [
    "Muharram",
    "Safar",
    "Rabi' al-Awwal",
    "Rabi' al-Thani",
    "Jumada al-Awwal",
    "Jumada al-Thani",
    "Rajab",
    "Sha'ban",
    "Ramadan",
    "Shawwal",
    "Dhu al-Qi'dah",
    "Dhu al-Hijjah",
  ];
  const monthNamesInKazakh = [
    "Мұхаррам",
    "Сафар",
    "Рабиғ әл-Әууәл",
    "Рабиғ әс-Сәни",
    "Жұмада әл-Әууәл",
    "Жұмада әс-Сәни",
    "Ражаб",
    "Шағбан",
    "Рамазан",
    "Шәууәл",
    "Зүл-Қағда",
    "Зүл-Хижжа",
  ];

  // Определяем, какой массив использовать в зависимости от языка
  const getLangCode = () => {
    const language = t("SettingsScreen.language").toLowerCase();
    if (language.includes("english")) return "en";
    if (language.includes("қазақша")) return "kk";
    return "ru";
  };

  const langCode = getLangCode();
  const monthNames =
    langCode === "en"
      ? monthNamesInEnglish
      : langCode === "kk"
      ? monthNamesInKazakh
      : monthNamesInRussian;

  const hijriDateString = `${adjustedHijriDate.day} ${
    monthNames[adjustedHijriDate.month - 1]
  } ${adjustedHijriDate.year}`;

  return (
    <View style={styles.container}>
      <StarryBackground />
      <View style={styles.contentQuran}>
        <View style={styles.topRectangle}>
          <Image
            source={require("../assets/mosque.jpg")}
            style={styles.backgroundImage}
            resizeMode="cover"
          />
          <View style={styles.contentOverlay}>
            <Text style={styles.title}>{t("MainMenu.lastReading")}</Text>
            <View style={styles.surahRow}>
              <Text style={styles.lastSurah}>
                {lastReadSurah || t("MainMenu.notSelected")}
              </Text>
              <Text style={styles.arabicSurah}>
                {lastReadArabicSurah || t("MainMenu.notSpecified")}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.continueReadingButton}
              onPress={() => goToLastReadSurah(navigation, lastReadSurah, t)}
            >
              <Text style={styles.continueReadingText}>
                {t("MainMenu.continue")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <LinearGradient
          style={styles.outerRectangle}
          colors={["#1D3D60", "#132741"]}
        >
          <View style={styles.nextPrayerContainer}>
            <Text style={styles.nextPrayerName}>{nextPrayer.name}</Text>
            <Text style={styles.nextPrayerTime}>
              {`${nextPrayer.time.hours}ч ${nextPrayer.time.minutes}м`}
            </Text>
          </View>
          <Text style={styles.titleNamaz}>{t("MainMenu.prayerTime")}</Text>
          <View style={styles.rectangleContainer}>
            {prayerNames.map((name, index) => {
              const prayerImages = [
                fajrCard,
                zuhrCard,
                asrCard,
                maghribCard,
                ishaCard,
              ];
              const prayerImage = prayerImages[index];

              return (
                <ImageBackground
                  key={index}
                  source={prayerImage}
                  style={styles.prayerCard}
                  imageStyle={{ resizeMode: "cover" }}
                >
                  <Text style={styles.prayerName}>{name}</Text>
                  {index === 0 && <Image source={fajr} style={styles.image2} />}
                  {index === 1 && <Image source={zuhr} style={styles.image2} />}
                  {index === 2 && (
                    <Image source={image2} style={styles.image2} />
                  )}
                  {index === 3 && (
                    <Image source={magrib} style={styles.image2} />
                  )}
                  {index === 4 && <Image source={asha} style={styles.image2} />}
                  <Text style={styles.prayerTime}>
                    {prayerTimes[prayerNamesMapping[name]]
                      ? name === t("MainMenu.asr")
                        ? addMinutesToTimeString(
                            prayerTimes[prayerNamesMapping[name]],
                            50
                          )
                        : prayerTimes[prayerNamesMapping[name]]
                      : "00:00"}
                  </Text>
                </ImageBackground>
              );
            })}
          </View>
          <Text style={styles.islamicDate}>{hijriDateString}</Text>
        </LinearGradient>
        <LinearGradient
          style={styles.duaRectangle}
          colors={["#1D3D60", "#132741"]}
        >
          <View style={styles.duaHeaderContainer}>
            <Text style={styles.titleDua}>{t("MainMenu.yourDuas")}</Text>
            <View style={styles.duaDiaryContainer}>
              <Text style={styles.duaDiaryText}>{t("MainMenu.duaDiary")}</Text>
            </View>
          </View>
          <FlatList
            data={duas}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("DuaDiary", { duaId: item.id })
                }
                style={styles.duaItem}
              >
                <Text style={styles.duaTitle}>{item.title}</Text>
                <Text style={styles.duaDescription}>
                  {item.description.length > 100
                    ? `${item.description.slice(0, 150)}...`
                    : item.description}
                </Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.duaSeparator} />}
            style={styles.duaList}
          />
        </LinearGradient>
      </View>
      <BottomMenu navigation={navigation} />
    </View>
  );
};

// Стили
const getStyles = (screenHeight, squareWidth) =>
  StyleSheet.create({
    container: {
      backgroundColor: "#08101B",
      flex: 1,
      justifyContent: "space-between",
      alignItems: "center",
    },
    contentQuran: {
      flex: 1,
      width: "100%",
      padding: 10,
    },
    topRectangle: {
      height: screenHeight / 4,
      borderRadius: 25,
      marginTop: 10,
      width: "100%",
      height: "53%",
      position: "relative",
      marginBottom: 20,
      alignSelf: "center",
      overflow: "hidden",
    },
    backgroundImage: {
      position: "absolute",
      width: "100%",
      height: "100%",
      opacity: 0.5,
    },
    contentOverlay: {
      flex: 1,
      justifyContent: "center",
      padding: 10,
      paddingLeft: 20,
      paddingRight: 20,
    },
    surahRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
      width: "100%",
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: "white",
      marginBottom: 25,
      alignSelf: "flex-start",
    },
    lastSurah: {
      fontSize: 20,
      color: "white",
    },
    arabicSurah: {
      fontSize: 30,
      color: "white",
      textAlign: "right",
    },
    continueReadingButton: {
      width: "50%",
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 30,
      borderColor: "#168C8B",
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "flex-start",
    },
    continueReadingText: {
      color: "white",
    },
    titleNamaz: {
      fontSize: 24,
      color: "white",
      alignSelf: "flex-start",
      marginBottom: 10,
      marginTop: -6,
    },
    titleDua: {
      fontSize: 24,
      fontWeight: "bold",
      color: "white",
      alignSelf: "flex-start",
      marginTop: 2,
      marginHorizontal: 5,
    },
    image2: {
      width: 50,
      height: 50,
      resizeMode: "contain",
      position: "static",
    },
    rectangleContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      marginBottom: 10,
    },
    prayerCard: {
      width: 63,
      height: 103,
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
    },
    prayerName: {
      color: "white",
      fontWeight: "light",
      fontSize: 14,
      marginTop: 0,
    },
    prayerTime: {
      color: "white",
      fontSize: 12,
      marginBottom: 5,
    },
    islamicDate: {
      color: "white",
      marginTop: -5,
    },
    nextPrayerContainer: {
      position: "absolute",
      top: 12,
      right: 10,
      padding: 10,
      borderRadius: 8,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    outerRectangle: {
      borderRadius: 25,
      top: 0,
      paddingHorizontal: 15,
      paddingVertical: 18,
      width: "100%",
      position: "relative",
      marginBottom: 20,
    },
    duaRectangle: {
      borderRadius: 25,
      padding: 15,
      width: "100%",
      position: "relative",
      marginBottom: 0,
      minHeight: screenHeight / 3,
      flex: 1,
    },
    duaHeaderContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      marginBottom: 10,
    },
    duaDiaryContainer: {
      position: "absolute",
      top: -2,
      right: 10,
      padding: 8,
      borderRadius: 8,
      width: "50%",
      alignItems: "flex-end",
    },
    duaDiaryText: {
      color: "white",
      fontSize: 20,
      textAlign: "right",
    },
    duaList: {
      flex: 1,
    },
    duaItem: {
      padding: 5,
      marginVertical: 4,
    },
    duaSeparator: {
      height: 1,
      backgroundColor: "#ffffff",
      marginVertical: 4,
    },
    duaTitle: {
      fontSize: 17,
      fontWeight: "bold",
      color: "#fff",
    },
    duaDescription: {
      fontSize: 15,
      color: "#fff",
      marginTop: 5,
    },
    nextPrayerName: {
      color: "white",
      marginRight: 10,
    },
    nextPrayerTime: {
      color: "white",
    },
  });

export default MainMenu;
