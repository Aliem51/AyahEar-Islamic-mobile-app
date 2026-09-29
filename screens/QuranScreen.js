import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
  Modal,
  TouchableWithoutFeedback,
  Pressable,
  TextInput,
  TouchableOpacity,
  Image,
} from "react-native";
import {
  TapGestureHandler,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useModal } from "./ModalContext";
import { useLanguage } from "../LanguageContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";

// Импортируем иконки из BottomMenu
import surahIcon from "../icons/quran/surah.png";
import homeIcon from "../icons/home.png";
import nextIcon from "../icons/quran/next.png";

// --- Загрузка базы
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

  await FileSystem.deleteAsync(dbPath, { idempotent: true });
  console.log("Копирование базы данных из assets...");
  await FileSystem.downloadAsync(assetPath, dbPath);
  console.log("База данных скопирована в:", dbPath);

  const db = SQLite.openDatabaseSync(dbName);
  return db;
};

const checkDatabaseSchema = (db) => {
  try {
    const tables = db.getAllSync(
      "SELECT name FROM sqlite_master WHERE type='table';"
    );
    console.log("Tables in database:", tables);
    const columnsAyahs = db.getAllSync("PRAGMA table_info(ayahs);");
    console.log("Columns in ayahs table:", columnsAyahs);
    const columnsSurahs = db.getAllSync("PRAGMA table_info(surahs);");
    console.log("Columns in surahs table:", columnsSurahs);
    return tables;
  } catch (error) {
    console.error("Ошибка схемы:", error);
    return [];
  }
};

const getSurahs = async (db) => {
  try {
    const surahs = await db.getAllAsync(
      "SELECT number, englishName, name FROM surahs;"
    );
    return surahs.map((row) => ({
      number: row.number,
      englishName: row.englishName,
      name: row.name,
      ayahs: [],
    }));
  } catch (error) {
    console.error("Ошибка загрузки сур:", error);
    return [];
  }
};

const getAyahsBySurah = async (db, surahNumber) => {
  try {
    const ayahs = await db.getAllAsync(
      "SELECT numberInSurah, text, kk_text, ru_text, en_text FROM ayahs WHERE surah_number = ?;",
      [surahNumber]
    );
    console.log("Loaded ayahs:", ayahs);
    return ayahs.map((row) => ({
      number: row.numberInSurah + surahNumber * 1000,
      numberInSurah: row.numberInSurah,
      text: row.text,
      kk_text: row.kk_text,
      ru_text: row.ru_text,
      en_text: row.en_text,
    }));
  } catch (error) {
    console.error("Ошибка загрузки аятов:", error);
    return [];
  }
};

// --- Основной экран
const QuranScreen = ({ navigation, route }) => {
  const { isModalVisible, toggleModal } = useModal();
  const { t, language } = useLanguage();
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [isMenuVisible, setMenuVisible] = useState(true);
  const [surahPickerVisible, setSurahPickerVisible] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;
  const [surahs, setSurahs] = useState([]);
  const [db, setDb] = useState(null);

  const getTranslationKey = (lang) => {
    switch (lang) {
      case "ru":
        return "ru_text";
      case "en":
        return "en_text";
      case "kk":
        return "kk_text";
      default:
        return "en_text";
    }
  };

  const loadLastOpenedSurah = async () => {
    try {
      const surahName = await AsyncStorage.getItem("LAST_OPENED_SURAH");
      if (surahName !== null && db) {
        const surah = surahs.find((s) => s.englishName === surahName);
        if (surah) {
          const ayahs = await getAyahsBySurah(db, surah.number);
          setSelectedSurah({ ...surah, ayahs });
          navigation.setOptions({ title: surah.englishName });
        }
      }
    } catch (error) {
      console.error("Ошибка чтения последней суры:", error);
    }
  };

  const saveLastSurah = async (surahName) => {
    try {
      await AsyncStorage.setItem("LAST_OPENED_SURAH", surahName);
    } catch (error) {
      console.error("Ошибка сохранения:", error);
    }
  };

  const toggleMenu = () => {
    setMenuVisible((prev) => !prev);
    Animated.timing(menuAnim, {
      toValue: isMenuVisible ? 100 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const loadedDb = await loadDatabase();
        setDb(loadedDb);
        checkDatabaseSchema(loadedDb);
        const surahsData = await getSurahs(loadedDb);
        setSurahs(surahsData);
        // Check for route parameter to load specific surah
        if (route.params?.surahNumber) {
          const surah = surahsData.find(
            (s) => s.number === route.params.surahNumber
          );
          if (surah) {
            const ayahs = await getAyahsBySurah(loadedDb, surah.number);
            setSelectedSurah({ ...surah, ayahs });
            navigation.setOptions({ title: surah.englishName });
            saveLastSurah(surah.englishName);
          }
        } else {
          await loadLastOpenedSurah();
        }
      } catch (error) {
        console.error("Ошибка инициализации:", error);
      }
    };
    initialize();
  }, [route.params?.surahNumber]);

  useEffect(() => {
    if (db && surahs.length > 0) {
      loadLastOpenedSurah();
    }
  }, [db, surahs]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <TapGestureHandler
          onHandlerStateChange={({ nativeEvent }) => {
            if (nativeEvent.state === 4) {
              if (!isModalVisible) {
                toggleMenu();
                Keyboard.dismiss();
              }
            }
          }}
        >
          <View style={styles.container}>
            <ScrollView
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContent}
            >
              {selectedSurah ? (
                selectedSurah.ayahs.map((ayah, index) => (
                  <View key={ayah.number} style={styles.ayahContainer}>
                    <Text style={styles.arabicText}>{ayah.text}</Text>
                    <Text style={styles.transText}>
                      {ayah[getTranslationKey(language)] ||
                        "Translation not available"}
                    </Text>
                    {index < selectedSurah.ayahs.length - 1 && (
                      <View style={styles.numberDividerContainer}>
                        <Text style={styles.ayahNumber}>
                          {`${selectedSurah.number}.${ayah.numberInSurah}`}
                        </Text>
                        <View style={styles.divider} />
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.message}>
                  {t("QuranScreen.selectSurah")}
                </Text>
              )}
            </ScrollView>

            <View style={styles.bottomMenu}>
              <TouchableOpacity onPress={() => setSurahPickerVisible(true)}>
                <Image source={surahIcon} style={{ width: 20, height: 40 }} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  console.log("Кнопка Домой нажата");
                  navigation.navigate("MainMenu");
                }}
              >
                <Image source={homeIcon} style={{ width: 41, height: 39 }} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  const currentIndex = surahs.findIndex(
                    (s) => s.englishName === selectedSurah?.englishName
                  );
                  if (currentIndex < surahs.length - 1) {
                    const nextSurah = surahs[currentIndex + 1];
                    const ayahs = await getAyahsBySurah(db, nextSurah.number);
                    setSelectedSurah({ ...nextSurah, ayahs });
                    navigation.setOptions({ title: nextSurah.englishName });
                    saveLastSurah(nextSurah.englishName);
                  }
                }}
              >
                <Image source={nextIcon} style={{ width: 30, height: 30 }} />
              </TouchableOpacity>
            </View>

            <SurahPickerModal
              visible={surahPickerVisible}
              onClose={() => setSurahPickerVisible(false)}
              surahs={surahs}
              onSelect={async (surah) => {
                const ayahs = await getAyahsBySurah(db, surah.number);
                setSelectedSurah({ ...surah, ayahs });
                navigation.setOptions({ title: surah.englishName });
                saveLastSurah(surah.englishName);
              }}
              t={t}
            />
          </View>
        </TapGestureHandler>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
};

// --- Меню выбора суры
const SurahPickerModal = ({ visible, onClose, surahs, onSelect, t }) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Фильтрация сур по поисковому запросу
  const filteredSurahs = surahs.filter(
    (surah) =>
      surah.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      surah.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.searchRow}>
                <TextInput
                  placeholder={t("QuranScreen.searchSurah")}
                  placeholderTextColor="#aaa"
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <View style={styles.tabRow}>
                <Pressable style={styles.tabActive}>
                  <Text style={styles.tabText}>{t("QuranScreen.surahs")}</Text>
                </Pressable>
                <Pressable style={styles.tabInactive}>
                  <Text style={styles.tabText}>{t("QuranScreen.juz")}</Text>
                </Pressable>
              </View>

              <ScrollView>
                {filteredSurahs.length > 0 ? (
                  filteredSurahs.map((surah) => (
                    <Pressable
                      key={surah.number}
                      style={styles.surahRow}
                      onPress={() => {
                        onSelect(surah);
                        onClose();
                      }}
                    >
                      <View>
                        <Text style={styles.surahNumber}>{surah.number}</Text>
                        <Text style={styles.surahName}>
                          {surah.englishName}
                        </Text>
                      </View>
                      <Text style={styles.surahArabic}>{surah.name}</Text>
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.noResults}>
                    {t("QuranScreen.noSurahsFound")}
                  </Text>
                )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// --- Стили
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1422",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  ayahContainer: {
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  ayahNumber: {
    color: "white",
    fontSize: 16,
    marginRight: 10,
    alignSelf: "center",
  },
  arabicText: {
    textAlign: "right",
    fontSize: 30,
    color: "#00DF4B",
    marginBottom: 10,
  },
  transText: {
    fontSize: 16,
    color: "white",
    marginBottom: 10,
  },
  numberDividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  divider: {
    flex: 1,
    borderBottomWidth: 2,
    borderBottomColor: "#1E2A3F",
  },
  message: {
    color: "white",
    fontSize: 18,
    textAlign: "center",
    marginTop: 20,
  },
  bottomMenu: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#10213",
    width: "100%",
    padding: 10,
    paddingBottom: 11,
    paddingLeft: 40,
    paddingRight: 40,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    backgroundColor: "#0E2D48",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#0A1422",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  searchRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#1C2A3A",
    color: "white",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  tabActive: {
    backgroundColor: "#2E3A59",
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  tabInactive: {
    borderColor: "#2E3A59",
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  tabText: {
    color: "white",
    fontWeight: "bold",
  },
  surahRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E2A3F",
  },
  surahNumber: {
    color: "white",
    fontSize: 16,
  },
  surahName: {
    color: "#aaa",
    fontSize: 13,
  },
  surahArabic: {
    color: "#00DF4B",
    fontSize: 22,
  },
  noResults: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
  },
});

export default QuranScreen;
