import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
  Image,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useLanguage } from "../LanguageContext";

import curanIcon from "../icons/curan.png";
import homeIcon from "../icons/home.png";
import burgerIcon from "../icons/burger.png";
import dua from "../icons/mainmenu/dua.png";
import gear from "../icons/mainmenu/gear.png";
import names from "../icons/mainmenu/names.png";
import zeekr from "../icons/mainmenu/zeekr.png";
import chat from "../icons/mainmenu/compass.png";
import micro from "../icons/mainmenu/micro.png";

const windowHeight = Dimensions.get("window").height;

const BottomMenu = () => {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const [isModalVisible, setModalVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0.4 * windowHeight)).current;

  const toggleModal = () => {
    setModalVisible(!isModalVisible);
  };

  const handlePress = (item) => {
    if (item.title === t("BottomMenu.settings")) {
      navigation.navigate("Settings");
      toggleModal();
    } else if (item.title === t("BottomMenu.zikr")) {
      navigation.navigate("Counter");
      toggleModal();
    } else if (item.title === t("BottomMenu.dua")) {
      navigation.navigate("DuaDiary");
      toggleModal();
    } else if (item.title === t("BottomMenu.ai")) {
      navigation.navigate("QuranRecognition");
      toggleModal();
    } else if (item.title === t("BottomMenu.qibla")) {
      navigation.navigate("Qibla");
      toggleModal();
    } else if (item.title === t("BottomMenu.names")) {
      navigation.navigate("NamesPage");
      toggleModal();
    }
  };

  useEffect(() => {
    if (isModalVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0.4 * windowHeight,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isModalVisible]);

  const menuItems = [
    { title: t("BottomMenu.qibla"), icon: chat },
    { title: t("BottomMenu.dua"), icon: dua },
    { title: t("BottomMenu.names"), icon: names },
    { title: t("BottomMenu.ai"), icon: micro },
    { title: t("BottomMenu.zikr"), icon: zeekr },
    { title: t("BottomMenu.settings"), icon: gear },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.menu}>
        <TouchableOpacity onPress={() => navigation.navigate("Quran")}>
          <Image source={curanIcon} style={{ width: 33, height: 31 }} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("MainMenu")}>
          <Image source={homeIcon} style={{ width: 41, height: 39 }} />
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleModal}>
          <Image source={burgerIcon} style={{ width: 38, height: 24 }} />
        </TouchableOpacity>
      </View>

      <Modal
        transparent={true}
        visible={isModalVisible}
        onRequestClose={toggleModal}
      >
        <Animated.View style={{ ...styles.overlay, opacity: fadeAnim }}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={toggleModal}
          />
        </Animated.View>
        <Animated.View
          style={{
            ...styles.modalView,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {menuItems.map((item, index) => (
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => handlePress(item)}
              key={index}
            >
              <Image source={item.icon} style={styles.menuImage} />
              <Text style={styles.menuText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  menu: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#2E3D57",
    width: "100%",
    padding: 10,
    paddingBottom: 11,
    paddingLeft: 40,
    paddingRight: 40,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    backgroundColor: "#0B1F30",
    margin: 0,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    position: "absolute",
    width: "100%",
    bottom: 0,
    height: 0.4 * windowHeight,
    backgroundColor: "#152C45",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 35,
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  menuButton: {
    width: 85,
    height: 100,
    backgroundColor: "#0a1522",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    margin: 10,
    marginBottom: 30,
  },
  menuImage: {
    width: 40,
    height: 40,
  },
  menuText: {
    color: "white",
    marginTop: 10,
  },
});

export default BottomMenu;
