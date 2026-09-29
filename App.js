import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  StatusBar,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";
import MainMenu from "./screens/MainMenu";
import QuranScreen from "./screens/QuranScreen";
import SettingsScreen from "./screens/SettingsScreen";
import DuaDiaryScreen from "./screens/DuaDiaryScreen";
import CounterScreen from "./screens/CounterScreen";
import ZikrScreen from "./screens/ZikrScreen";
import AuthScreen from "./screens/AuthScreen";
import NamesPage from "./screens/NamesPage";
import QuranRecognitionScreen from "./screens/QuranRecognitionScreen";
import { auth, messaging, firestore } from "./firebaseConfig";
import { collection, doc, setDoc } from "@react-native-firebase/firestore";
import { ModalProvider, useModal } from "./screens/ModalContext";
import { LanguageProvider } from "./LanguageContext.js";
import { useTranslation } from "react-i18next";
import { loadLanguage } from "./i18n";
import QiblaScreen from "./screens/QiblaScreen";
import { enableScreens } from "react-native-screens";

enableScreens();

const Stack = createStackNavigator();

// Компонент для кнопки "назад"
const LeftHeaderButton = ({ navigation, onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress || (() => navigation.goBack())}
      style={styles.backButton}
    >
      <Image
        source={require("./assets/back_icon.png")}
        style={styles.backIcon}
      />
    </TouchableOpacity>
  );
};

// Компонент для кнопки бургер-меню
const RightHeaderMenuButton = () => {
  const { toggleModal } = useModal();
  return (
    <TouchableOpacity
      onPress={toggleModal}
      style={styles.burgerButton}
    ></TouchableOpacity>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const { i18n } = useTranslation(); // Подписываемся на изменения языка

  useEffect(() => {
    loadLanguage();

    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        if (currentUser.emailVerified) {
          setUser(currentUser);
          setIsEmailVerified(true);
          registerForPushNotificationsAsync();
        } else {
          setUser(null);
          setIsEmailVerified(false);
        }
      } else {
        setUser(null);
        setIsEmailVerified(false);
      }
    });

    const unsubscribeMessaging = messaging.onMessage(async (remoteMessage) => {
      console.log("Foreground notification:", remoteMessage);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeMessaging();
    };
  }, []);

  async function registerForPushNotificationsAsync() {
    try {
      const hasPermission = await messaging.hasPermission();
      if (hasPermission === -1 || hasPermission === 0) {
        const permission = await messaging.requestPermission();
        if (permission !== 1) {
          console.log("Permission denied");
          return;
        }
      }

      const token = await messaging.getToken();
      console.log("FCM Token:", token);

      if (auth.currentUser) {
        const userRef = doc(firestore, "users", auth.currentUser.uid);
        await setDoc(userRef, { fcmToken: token }, { merge: true });
      }
    } catch (error) {
      console.error("Error getting token:", error);
    }
  }

  return (
    <LanguageProvider>
      <ModalProvider>
        <SafeAreaProvider>
          <StatusBar backgroundColor="#08101B" barStyle="light-content" />
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName={user && isEmailVerified ? "MainMenu" : "Auth"}
              screenOptions={{
                headerTintColor: "#fff",
                headerTitleStyle: {
                  fontSize: 22,
                },
              }}
            >
              {!(user && isEmailVerified) ? (
                <Stack.Screen
                  name="Auth"
                  component={AuthScreen}
                  options={{
                    title: i18n.t("AuthScreen.auth"),
                    headerStyle: { backgroundColor: "#0A1422" },
                  }}
                />
              ) : (
                <>
                  <Stack.Screen
                    name="MainMenu"
                    component={MainMenu}
                    options={{
                      title: i18n.t("MainMenu.main_menu"),
                      headerStyle: { backgroundColor: "#08101B" },
                      headerTitleStyle: { fontSize: 33 },
                    }}
                  />
                  <Stack.Screen
                    name="Quran"
                    component={QuranScreen}
                    options={({ navigation }) => ({
                      title: i18n.t("QuranScreen.quran"),
                      headerStyle: { backgroundColor: "#0A1422" },
                      headerLeft: () => (
                        <LeftHeaderButton
                          navigation={navigation}
                          onPress={() => navigation.navigate("MainMenu")}
                        />
                      ),
                      headerRight: () => <RightHeaderMenuButton />,
                    })}
                  />
                  <Stack.Screen
                    name="Settings"
                    component={SettingsScreen}
                    options={({ navigation }) => ({
                      title: i18n.t("SettingsScreen.settings"),
                      headerStyle: { backgroundColor: "#0A1422" },
                      headerLeft: () => (
                        <LeftHeaderButton navigation={navigation} />
                      ),
                    })}
                  />
                  <Stack.Screen
                    name="DuaDiary"
                    component={DuaDiaryScreen}
                    options={({ navigation }) => ({
                      title: i18n.t("DuaDiaryScreen.dua_diary"),
                      headerStyle: { backgroundColor: "#0A1422" },
                      headerLeft: () => (
                        <LeftHeaderButton navigation={navigation} />
                      ),
                    })}
                  />
                  <Stack.Screen
                    name="Counter"
                    component={CounterScreen}
                    options={({ navigation }) => ({
                      title: i18n.t("CounterScreen.counter"),
                      headerStyle: { backgroundColor: "#0A1422" },
                      headerLeft: () => (
                        <LeftHeaderButton navigation={navigation} />
                      ),
                    })}
                  />
                  <Stack.Screen
                    name="ZikrScreen"
                    component={ZikrScreen}
                    options={({ navigation }) => ({
                      title: i18n.t("ZikrScreen.zikrs"),
                      headerStyle: { backgroundColor: "#0A1422" },
                      headerLeft: () => (
                        <LeftHeaderButton navigation={navigation} />
                      ),
                    })}
                  />
                  <Stack.Screen
                    name="QuranRecognition"
                    component={QuranRecognitionScreen}
                    options={({ navigation }) => ({
                      title: i18n.t("QuranRecognitionScreen.quran_recognition"),
                      headerStyle: { backgroundColor: "#0A1422" },
                      headerLeft: () => (
                        <LeftHeaderButton navigation={navigation} />
                      ),
                    })}
                  />
                  <Stack.Screen
                    name="Qibla"
                    component={QiblaScreen}
                    options={({ navigation }) => ({
                      title: i18n.t("QiblaScreen.Qibla"), // Используем "AyahEar" как заголовок
                      headerStyle: { backgroundColor: "#0A1422" },
                      headerLeft: () => (
                        <LeftHeaderButton navigation={navigation} />
                      ),
                    })}
                  />
                  <Stack.Screen
                    name="NamesPage"
                    component={NamesPage}
                    options={({ navigation }) => ({
                      title: i18n.t("NamesPage.names_page"),
                      headerStyle: { backgroundColor: "#0A1422" },
                      headerLeft: () => (
                        <LeftHeaderButton navigation={navigation} />
                      ),
                    })}
                  />
                </>
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </ModalProvider>
    </LanguageProvider>
  );
};

const styles = StyleSheet.create({
  burgerButton: { marginRight: 15 },
  backButton: { marginLeft: 25 },
  backIcon: { width: 30, height: 16 },
});

export default App;
