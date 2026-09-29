import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ImageBackground,
  ActivityIndicator,
} from "react-native";
import { auth } from "../firebaseConfig";
import { useLanguage } from "../LanguageContext.js";

const AuthScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [emailSentMessage, setEmailSentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendEmailVerification = async (user) => {
    try {
      await user.sendEmailVerification();
      console.log("Письмо для верификации отправлено на:", user.email);
      setEmailSentMessage(
        t("AuthScreen.emailSentMessage", { email: user.email })
      );
    } catch (error) {
      Alert.alert(
        t("common.error"),
        t("AuthScreen.errorVerificationEmail") + error.message
      );
    }
  };

  const handleAuth = async () => {
    try {
      setIsLoading(true);
      if (!email || !password) {
        Alert.alert(
          t("common.error"),
          t("AuthScreen.pleaseEnterEmailAndPassword")
        );
        return;
      }

      if (!isLogin && password !== confirmPassword) {
        Alert.alert(t("common.error"), t("AuthScreen.passwordsDoNotMatch"));
        return;
      }

      if (isLogin) {
        console.log("Попытка входа с email:", email);
        const userCredential = await auth.signInWithEmailAndPassword(
          email,
          password
        );
        const user = userCredential.user;
        console.log("Пользователь после входа:", user);

        if (!user.emailVerified) {
          console.log("Email не подтверждён, выходим...");
          setEmailSentMessage(
            t("AuthScreen.emailSentMessage", { email: user.email })
          );
          setTimeout(async () => {
            await auth.signOut();
          }, 500);
          return;
        }

        console.log("Email подтверждён, вход успешен!");
      } else {
        console.log("Попытка регистрации с email:", email);
        const userCredential = await auth.createUserWithEmailAndPassword(
          email,
          password
        );
        const user = userCredential.user;
        console.log("Пользователь после регистрации:", user);

        await sendEmailVerification(user);
        await auth.signOut();
        Alert.alert(t("common.success"), t("AuthScreen.successAccountCreated"));
        setIsLogin(true);
      }
    } catch (error) {
      console.error("Ошибка при аутентификации:", error);
      Alert.alert(t("common.error"), error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    try {
      setIsLoading(true);
      console.log("Повторная отправка письма для email:", email);
      const userCredential = await auth.signInWithEmailAndPassword(
        email,
        password
      );
      const user = userCredential.user;

      if (!user.emailVerified) {
        await sendEmailVerification(user);
        Alert.alert(t("common.success"), t("AuthScreen.sendAgain"));
      }

      await auth.signOut();
    } catch (error) {
      console.error("Ошибка при повторной отправке письма:", error);
      Alert.alert(
        t("common.error"),
        t("AuthScreen.errorSendEmail") + error.message
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("../assets/star.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <Text style={styles.appTitle}>{t("AuthScreen.appTitle")}</Text>
        <Text style={styles.title}>
          {emailSentMessage && isLogin
            ? t("AuthScreen.checkYourEmail")
            : isLogin
            ? t("AuthScreen.signIn")
            : t("AuthScreen.createAccount")}
        </Text>

        <View style={styles.inputContainer}>
          <Image source={require("../assets/mail.png")} style={styles.icon} />
          <TextInput
            style={[
              styles.input,
              styles.inputWithIcon,
              isLogin ? styles.inputTopRounded : styles.inputTopRounded,
            ]}
            placeholder={t("AuthScreen.enterYourEmail")}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailSentMessage("");
            }}
            autoCapitalize="none"
            placeholderTextColor="#ccc"
          />
        </View>

        <View style={styles.inputContainer}>
          <Image source={require("../assets/lock.png")} style={styles.icon} />
          <TextInput
            style={[
              styles.input,
              styles.inputWithIcon,
              isLogin ? styles.inputBottomRounded : styles.inputNoRounded,
            ]}
            placeholder={t("AuthScreen.password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#ccc"
          />
        </View>

        {!isLogin && (
          <View style={styles.inputContainer}>
            <Image source={require("../assets/lock.png")} style={styles.icon} />
            <TextInput
              style={[
                styles.input,
                styles.inputWithIcon,
                styles.inputBottomRounded,
              ]}
              placeholder={t("AuthScreen.repeatPassword")}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholderTextColor="#ccc"
            />
          </View>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={handleAuth}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isLogin ? t("AuthScreen.logIn") : t("AuthScreen.registration")}
            </Text>
          )}
        </TouchableOpacity>

        {emailSentMessage && isLogin && (
          <View style={styles.messageContainer}>
            <Text style={styles.infoText}>{emailSentMessage}</Text>
            <Text style={styles.resendText}>
              {t("AuthScreen.didntGetCode")}
            </Text>
            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResendEmail}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.resendButtonText}>
                  {t("AuthScreen.sendAgain")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {!emailSentMessage && (
          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {isLogin
                ? t("AuthScreen.dontHaveAccount")
                : t("AuthScreen.alreadyHaveAccount")}
              <Text
                style={styles.switchLink}
                onPress={() => {
                  setIsLogin(!isLogin);
                  setEmailSentMessage("");
                }}
              >
                {isLogin ? t("AuthScreen.signUp") : t("AuthScreen.logInLink")}
              </Text>
            </Text>
          </View>
        )}
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#0A1422",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  appTitle: {
    fontSize: 60,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    color: "#fff",
    marginBottom: 30,
    fontWeight: "bold",
  },
  inputContainer: {
    width: "100%",
    marginBottom: 5,
    position: "relative",
  },
  input: {
    backgroundColor: "#2D2D2D",
    color: "#fff",
    padding: 15,
    fontSize: 16,
    width: "100%",
  },
  inputWithIcon: {
    paddingLeft: 45,
  },
  inputTopRounded: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  inputNoRounded: {
    borderRadius: 0,
  },
  inputBottomRounded: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  icon: {
    width: 20,
    height: 20,
    position: "absolute",
    left: 15,
    top: "50%",
    transform: [{ translateY: -10 }],
    tintColor: "#fff",
  },
  button: {
    backgroundColor: "#1E90FF",
    borderRadius: 10,
    paddingVertical: 15,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  messageContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  infoText: {
    color: "#fff",
    textAlign: "center",
    marginBottom: 10,
    fontSize: 14,
  },
  resendText: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 10,
  },
  resendButton: {
    backgroundColor: "#2D2D2D",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  resendButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  switchContainer: {
    marginTop: 20,
  },
  switchText: {
    color: "#fff",
    fontSize: 14,
  },
  switchLink: {
    color: "#1E90FF",
    fontWeight: "bold",
  },
});

export default AuthScreen;
