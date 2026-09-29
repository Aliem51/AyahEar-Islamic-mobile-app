import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import BottomMenu from "./BottomMenu";
import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";
import { useLanguage } from "../LanguageContext"; // Импортируем хук для переводов

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

const getAllZikrs = async (db) => {
  try {
    const zikrs = await db.getAllAsync(
      "SELECT id, title, transcript, arabic, count, translate FROM zikrs;"
    );
    console.log("Результат запроса зикров:", zikrs);
    return zikrs;
  } catch (error) {
    console.error("Ошибка загрузки зикров:", error);
    return [];
  }
};

const ZikrList = () => {
  const { t } = useLanguage(); // Получаем функцию перевода
  const [zikrsData, setZikrsData] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [db, setDb] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const initialize = async () => {
      try {
        const loadedDb = await loadDatabase();
        setDb(loadedDb);
        const zikrsFromDb = await getAllZikrs(loadedDb);
        setZikrsData(zikrsFromDb);
      } catch (error) {
        console.error("Ошибка инициализации базы данных:", error);
      }
    };
    initialize();
  }, []);

  const handleFavoriteToggle = (item) => {
    setFavorites((prevFavorites) => {
      if (prevFavorites.includes(item.id)) {
        return prevFavorites.filter((id) => id !== item.id);
      }
      return [...prevFavorites, item.id];
    });
  };

  const renderItem = ({ item }) => {
    const isFavorite = favorites.includes(item.id);

    return (
      <TouchableOpacity
        style={styles.zikrItem}
        onPress={() => navigation.navigate("ZikrScreen", { zikrId: item.id })}
      >
        <View style={styles.zikrTextContainer}>
          <Text style={styles.title}>
            {item.title || t("CounterScreen.notFound")}
          </Text>
          <Text style={styles.transcript}>{item.transcript}</Text>
        </View>
        <TouchableOpacity onPress={() => handleFavoriteToggle(item)}>
          <Text style={styles.favorite}>{isFavorite ? "★" : "☆"}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const filteredZikrs =
    activeTab === "favorites"
      ? zikrsData.filter((item) => favorites.includes(item.id))
      : zikrsData;

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "all" && styles.activeTab]}
          onPress={() => setActiveTab("all")}
        >
          <Text style={styles.tabText}>{t("CounterScreen.allZikrs")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "favorites" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("favorites")}
        >
          <Text style={styles.tabText}>{t("CounterScreen.favorites")}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <FlatList
          data={filteredZikrs}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
        />
      </View>

      <BottomMenu navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B223F",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  tabButton: {
    padding: 10,
    backgroundColor: "#124C79",
    borderRadius: 20,
    marginHorizontal: 5,
  },
  activeTab: {
    backgroundColor: "#1F5B99",
  },
  tabText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 10,
  },
  zikrItem: {
    backgroundColor: "#124C79",
    padding: 15,
    marginVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  zikrTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  transcript: {
    fontSize: 14,
    color: "#D1D1D1",
    marginTop: 5,
  },
  favorite: {
    fontSize: 24,
    color: "#FFD700",
    marginLeft: 15,
  },
});

export default ZikrList;
