import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Button,
  Alert,
} from "react-native";
import { firestore, auth } from "../firebaseConfig";
import { serverTimestamp } from "@react-native-firebase/firestore";
import BottomMenu from "./BottomMenu";
import { useLanguage } from "../LanguageContext"; // Импортируем хук для переводов

const DuaDiaryScreen = ({ route }) => {
  const { t } = useLanguage(); // Получаем функцию перевода
  const [duas, setDuas] = useState([]);
  const [isAddMode, setAddMode] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [arabicText, setArabicText] = useState("");
  const [isExpanded, setIsExpanded] = useState({});
  const [selectedDua, setSelectedDua] = useState(null);
  const [isEditMode, setEditMode] = useState(false);
  const [isOptionsVisible, setOptionsVisible] = useState(false);

  const user = auth.currentUser;
  const { duaId } = route.params || {};

  useEffect(() => {
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

          if (duaId && duaList.some((dua) => dua.id === duaId)) {
            setIsExpanded((prevState) => ({
              ...prevState,
              [duaId]: true,
            }));
          }
        },
        (error) => {
          console.error("Ошибка загрузки дуа:", error);
        }
      );

    return () => subscriber();
  }, [user, duaId]);

  const addDua = async () => {
    if (title && description && arabicText && user) {
      try {
        await firestore.collection("duas").add({
          title,
          description,
          arabicText,
          userId: user.uid,
          createdAt: serverTimestamp(),
        });
        setTitle("");
        setDescription("");
        setArabicText("");
        setAddMode(false);
      } catch (error) {
        console.error("Ошибка добавления дуа:", error);
      }
    }
  };

  const editDua = async () => {
    if (selectedDua && user) {
      try {
        await firestore.collection("duas").doc(selectedDua.id).update({
          title,
          description,
          arabicText,
        });
        setSelectedDua(null);
        setTitle("");
        setDescription("");
        setArabicText("");
        setEditMode(false);
        setOptionsVisible(false);
      } catch (error) {
        console.error("Ошибка редактирования дуа:", error);
      }
    }
  };

  const deleteDua = async () => {
    if (selectedDua && user) {
      try {
        await firestore.collection("duas").doc(selectedDua.id).delete();
        setSelectedDua(null);
        setOptionsVisible(false);
      } catch (error) {
        console.error("Ошибка удаления дуа:", error);
      }
    }
  };

  const toggleExpand = (id) => {
    setIsExpanded((prevState) => ({
      ...prevState,
      [id]: !prevState[id],
    }));
  };

  const openOptions = (dua) => {
    setSelectedDua(dua);
    setOptionsVisible(true);
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={duas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => toggleExpand(item.id)}
            onLongPress={() => openOptions(item)}
          >
            <View style={styles.item}>
              <Text style={styles.duaTitle}>{item.title}</Text>
              <Text style={styles.duaDescription}>
                {isExpanded[item.id]
                  ? item.description
                  : item.description.length > 50
                  ? `${item.description.slice(0, 50)}...`
                  : item.description}
              </Text>
              {isExpanded[item.id] && (
                <Text style={styles.duaArabic}>{item.arabicText}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setAddMode(true)}
      >
        <Image
          source={require("../assets/icons/plus.png")}
          style={styles.addButtonImage}
        />
      </TouchableOpacity>

      <Modal
        visible={isAddMode || isEditMode}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t("DuaDiaryScreen.titlePlaceholder")}
              style={styles.input}
              placeholderTextColor="#ccc"
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t("DuaDiaryScreen.duaPlaceholder")}
              multiline
              style={styles.textArea}
              placeholderTextColor="#ccc"
            />
            <TextInput
              value={arabicText}
              onChangeText={setArabicText}
              placeholder={t("DuaDiaryScreen.arabicPlaceholder")}
              multiline
              style={styles.textArea}
              placeholderTextColor="#ccc"
            />
            <View style={styles.modalButtons}>
              <Button
                title={
                  isEditMode
                    ? t("DuaDiaryScreen.saveChanges")
                    : t("DuaDiaryScreen.add")
                }
                onPress={isEditMode ? editDua : addDua}
                color="#124C79"
              />
              <Button
                title={t("DuaDiaryScreen.cancel")}
                onPress={() => {
                  setAddMode(false);
                  setEditMode(false);
                }}
                color="#124C79"
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isOptionsVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              onPress={() => {
                setTitle(selectedDua.title);
                setDescription(selectedDua.description);
                setArabicText(selectedDua.arabicText);
                setEditMode(true);
                setOptionsVisible(false);
              }}
              style={styles.modalButton}
            >
              <Text style={styles.modalButtonText}>
                {t("DuaDiaryScreen.edit")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  t("DuaDiaryScreen.confirmDeleteTitle"),
                  t("DuaDiaryScreen.confirmDeleteMessage"),
                  [
                    {
                      text: t("DuaDiaryScreen.confirmDeleteCancel"),
                      style: "cancel",
                    },
                    {
                      text: t("DuaDiaryScreen.confirmDeleteConfirm"),
                      onPress: deleteDua,
                    },
                  ]
                );
              }}
              style={styles.modalButton}
            >
              <Text style={styles.modalButtonText}>
                {t("DuaDiaryScreen.delete")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setOptionsVisible(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.modalButtonText}>
                {t("DuaDiaryScreen.close")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomMenu />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0A1422",
  },
  item: {
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 9,
    backgroundColor: "#124C79",
    borderRadius: 12,
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
  duaArabic: {
    fontSize: 22,
    color: "#00FF7F",
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 8,
    lineHeight: 22,
  },
  addButton: {
    backgroundColor: "#124C79",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    right: 35,
    bottom: 90,
  },
  addButtonImage: {
    width: 30,
    height: 30,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#1E1E1E",
    padding: 20,
    borderRadius: 12,
  },
  modalButtons: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  modalButton: {
    backgroundColor: "#124C79",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 5,
  },
  deleteButton: {
    backgroundColor: "#521A1B",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 5,
  },
  cancelButton: {
    backgroundColor: "#8C8C8C",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 5,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#2D2D2D",
    borderRadius: 8,
    color: "#fff",
    padding: 12,
    marginBottom: 16,
  },
  textArea: {
    backgroundColor: "#2D2D2D",
    borderRadius: 8,
    color: "#fff",
    padding: 12,
    height: 100,
    textAlignVertical: "top",
    marginBottom: 16,
  },
});

export default DuaDiaryScreen;
