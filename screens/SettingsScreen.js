import React from "react";
import {
  View,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
  Image,
  Switch,
} from "react-native";
import BottomMenu from "./BottomMenu";
import { useLanguage } from "../LanguageContext";
import { auth } from "../firebaseConfig";
import { createStackNavigator } from "@react-navigation/stack";
import { changeLanguage } from "../i18n";

// Заглушки для иконок
const emailIcon = require("../assets/email_icon.png");
const locationIcon = require("../assets/location_icon.png");
const languageIcon = require("../assets/language_icon.png");
const notificationIcon = require("../assets/notification_icon.png");
const whatsNewIcon = require("../assets/whats_new_icon.png");
const aboutIcon = require("../assets/about_icon.png");
// Заглушки для флагов
const kazakhstanFlag = require("../assets/kazakhstan_flag.png");
const russianFlag = require("../assets/russian_flag.png");
const englishFlag = require("../assets/english_flag.png");
// Иконка для кнопки "Назад"
const backIcon = require("../assets/back_icon.png");

const Stack = createStackNavigator();

// Функция для маскировки email
const maskEmail = (email, t) => {
  if (!email) return t("SettingsScreen.notSpecified");
  const [localPart, domain] = email.split("@");
  if (localPart.length <= 3) return email;
  const start = localPart.substring(0, Math.max(1, localPart.length - 5));
  const end = localPart.substring(localPart.length - 2);
  return `${start}***${end}@${domain}`;
};

// Главный экран настроек
const MainSettingsScreen = ({ navigation }) => {
  const { language, t } = useLanguage();
  const userEmail = auth.currentUser?.email || null;
  const maskedEmail = maskEmail(userEmail, t);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Раздел Аккаунт */}
        <Text style={styles.sectionTitle}>{t("SettingsScreen.account")}</Text>
        <View style={styles.accountBlock}>
          <TouchableOpacity style={styles.accountItem}>
            <Image source={emailIcon} style={styles.accountIcon} />
            <Text style={styles.accountText}>{t("SettingsScreen.email")}</Text>
            <Text style={styles.accountSubText}>{maskedEmail}</Text>
          </TouchableOpacity>
        </View>

        {/* Раздел Местоположение */}
        <Text style={styles.sectionTitle}>{t("SettingsScreen.location")}</Text>
        <View style={styles.settingsList}>
          <View style={styles.settingsItem}>
            <Text style={styles.settingsText}>
              {t("SettingsScreen.autoDetect")}
            </Text>
            <Switch
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor="#fff"
              ios_backgroundColor="#3e3e3e"
              value={true}
            />
          </View>
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => navigation.navigate("LocationSettings")}
          >
            <Text style={styles.settingsText}>
              {t("SettingsScreen.manualSelect")}
            </Text>
            <Text style={styles.sectionSubText}>
              {t("SettingsScreen.almaty")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Раздел Настройки */}
        <Text style={styles.sectionTitle}>{t("SettingsScreen.settings")}</Text>
        <View style={styles.groupedBlock}>
          <TouchableOpacity
            style={styles.groupedSectionBlock}
            onPress={() => navigation.navigate("LanguageSettings")}
          >
            <Image source={languageIcon} style={styles.sectionIcon} />
            <View style={styles.textContainer}>
              <Text style={styles.sectionText}>
                {t("SettingsScreen.language")}
              </Text>
              <Text style={styles.sectionSubText}>
                {language === "en"
                  ? t("SettingsScreen.english")
                  : language === "kk"
                  ? t("SettingsScreen.kazakh")
                  : t("SettingsScreen.russian")}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity
            style={styles.groupedSectionBlock}
            onPress={() => navigation.navigate("SoundAndNotifications")}
          >
            <Image source={notificationIcon} style={styles.sectionIcon} />
            <Text style={styles.sectionText}>
              {t("SettingsScreen.notificationsAndSound")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Раздел "Что нового?" и "О AyahEar" */}
        <View style={styles.groupedBlock}>
          <TouchableOpacity
            style={styles.groupedSectionBlock}
            onPress={() => navigation.navigate("AboutAyahEar")}
          >
            <Image source={whatsNewIcon} style={styles.sectionIcon} />
            <View style={styles.textContainer}>
              <Text style={styles.sectionText}>
                {t("SettingsScreen.whatsNew")}
              </Text>
              <Text style={styles.sectionSubText}>
                {t("SettingsScreen.version")}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity
            style={styles.groupedSectionBlock}
            onPress={() => navigation.navigate("AboutAyahEar")}
          >
            <Image source={aboutIcon} style={styles.sectionIcon} />
            <Text style={styles.sectionText}>
              {t("SettingsScreen.aboutAyahEar")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Кнопка выхода */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={async () => {
            try {
              await auth.signOut();
              Alert.alert(
                t("common.success"),
                t("SettingsScreen.signOutSuccess")
              );
            } catch (error) {
              Alert.alert(
                t("common.error"),
                t("SettingsScreen.signOutError") + error.message
              );
            }
          }}
        >
          <Text style={styles.signOutText}>{t("SettingsScreen.signOut")}</Text>
        </TouchableOpacity>
      </View>
      <BottomMenu navigation={navigation} />
    </View>
  );
};

// Экран "Уведомление и звук"
const SoundAndNotificationsScreen = ({ navigation }) => {
  const { t } = useLanguage();

  return (
    <View style={styles.subScreenContainer}>
      <View style={styles.settingsList}>
        <View style={styles.settingsItem}>
          <Text style={styles.settingsText}>
            {t("SettingsScreen.turnOffNotifications")}
          </Text>
          <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor="#fff"
            ios_backgroundColor="#3e3e3e"
            value={true}
          />
        </View>
        <View style={styles.settingsItem}>
          <Text style={styles.settingsText}>
            {t("SettingsScreen.vibration")}
          </Text>
        </View>
        <View style={styles.settingsItem}>
          <Text style={styles.settingsText}>
            {t("SettingsScreen.ringtone")}
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Image source={backIcon} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.footerTitle}>
          {t("SettingsScreen.notificationsAndSound")}
        </Text>
      </View>
    </View>
  );
};

// Экран "Язык"
const LanguageSettingsScreen = ({ navigation }) => {
  const { t, setLanguage } = useLanguage();

  return (
    <View style={styles.subScreenContainer}>
      <View style={styles.languageList}>
        <TouchableOpacity
          style={styles.languageButton}
          onPress={() => setLanguage("kk")}
        >
          <Image source={kazakhstanFlag} style={styles.flagIcon} />
          <Text style={styles.languageText}>{t("SettingsScreen.kazakh")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.languageButton}
          onPress={() => setLanguage("ru")}
        >
          <Image source={russianFlag} style={styles.flagIcon} />
          <Text style={styles.languageText}>{t("SettingsScreen.russian")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.languageButton}
          onPress={() => setLanguage("en")}
        >
          <Image source={englishFlag} style={styles.flagIcon} />
          <Text style={styles.languageText}>{t("SettingsScreen.english")}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Image source={backIcon} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.footerTitle}>{t("SettingsScreen.language")}</Text>
      </View>
    </View>
  );
};

// Экран "О AyahEar"
const AboutAyahEarScreen = ({ navigation }) => {
  const { t } = useLanguage();

  return (
    <View style={styles.subScreenContainer}>
      <Text style={styles.aboutText}>{t("SettingsScreen.aboutText")}</Text>
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Image source={backIcon} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.footerTitle}>
          {t("SettingsScreen.aboutAyahEar")}
        </Text>
      </View>
    </View>
  );
};

// Основной компонент с навигацией
const SettingsScreen = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainSettings" component={MainSettingsScreen} />
      <Stack.Screen
        name="SoundAndNotifications"
        component={SoundAndNotificationsScreen}
      />
      <Stack.Screen
        name="LanguageSettings"
        component={LanguageSettingsScreen}
      />
      <Stack.Screen name="AboutAyahEar" component={AboutAyahEarScreen} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1422",
    justifyContent: "space-between",
    alignItems: "center",
  },
  content: {
    flex: 1,
    width: "100%",
    padding: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
    marginTop: 10,
  },
  accountBlock: {
    backgroundColor: "#152C45",
    borderRadius: 20,
    paddingVertical: 10,
    marginBottom: 10,
  },
  accountItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  accountIcon: {
    width: 25,
    height: 25,
    marginRight: 10,
  },
  accountText: {
    fontSize: 16,
    color: "#fff",
    flex: 1,
  },
  accountSubText: {
    fontSize: 14,
    color: "#ccc",
  },
  sectionBlock: {
    backgroundColor: "#152C45",
    padding: 15,
    borderRadius: 20,
    marginBottom: 10,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  groupedBlock: {
    backgroundColor: "#152C45",
    borderRadius: 20,
    marginBottom: 10,
    width: "100%",
  },
  groupedSectionBlock: {
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  sectionIcon: {
    width: 25,
    height: 25,
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
    flexDirection: "column",
  },
  sectionText: {
    fontSize: 16,
    color: "#fff",
  },
  sectionSubText: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 5,
  },
  separator: {
    height: 1,
    backgroundColor: "#fff",
    marginHorizontal: 15,
  },
  settingsList: {
    backgroundColor: "#152C45",
    borderRadius: 20,
    paddingVertical: 10,
    marginBottom: 10,
  },
  settingsItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  settingsText: {
    fontSize: 16,
    color: "#fff",
  },
  signOutButton: {
    backgroundColor: "#421414",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 10,
    width: "100%",
    alignItems: "center",
  },
  signOutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  subScreenContainer: {
    flex: 1,
    backgroundColor: "#0A1422",
    padding: 20,
    justifyContent: "space-between",
  },
  aboutText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  languageList: {
    backgroundColor: "#152C45",
    borderRadius: 20,
    paddingVertical: 10,
  },
  languageButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  flagIcon: {
    width: 30,
    height: 20,
    marginRight: 15,
  },
  languageText: {
    fontSize: 16,
    color: "#fff",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#152C45",
    padding: 10,
    borderRadius: 8,
    width: "100%",
    marginBottom: 20,
  },
  footerTitle: {
    fontSize: 16,
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 15,
  },
  backIcon: {
    width: 36,
    height: 20,
    marginRight: 5,
  },
});

export default SettingsScreen;
