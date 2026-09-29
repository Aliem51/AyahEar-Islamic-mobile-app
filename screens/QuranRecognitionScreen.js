import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Linking,
} from "react-native";
import { Audio } from "expo-av";
import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system";
import axios from "axios";
import { useLanguage } from "../LanguageContext";
import { useNavigation } from "@react-navigation/native";
import BottomMenu from "./BottomMenu";

const GOOGLE_SPEECH_API_KEY = process.env.GOOGLE_SPEECH_API_KEY || "";


const QuranRecognitionScreen = () => {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const [recording, setRecording] = useState(null);
  const [recognizedSurah, setRecognizedSurah] = useState("");
  const [recognizedText, setRecognizedText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const db = SQLite.openDatabaseSync("quran.db");

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        console.log("Разрешение на запись не предоставлено");
        return;
      }

      const recordingObject = new Audio.Recording();
      await recordingObject.prepareToRecordAsync({
        android: {
          extension: ".wav",
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_WAV,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT,
          sampleRate: 8000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: ".wav",
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 8000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });
      await recordingObject.startAsync();
      setRecording(recordingObject);
      setIsListening(true);
      setRecognizedText("");
      setRecognizedSurah("");
      console.log("Запись началась");
    } catch (error) {
      console.error("Ошибка начала записи:", error);
    }
  };

  const stopRecording = async () => {
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setIsListening(false);
      setIsSearching(true);
      console.log("Запись остановлена, URI:", uri);

      const savedUri = `${FileSystem.documentDirectory}test_recording.wav`;
      await FileSystem.copyAsync({ from: uri, to: savedUri });
      console.log("Файл сохранён для проверки:", savedUri);

      const audioContent = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log("Base64 длина:", audioContent.length);
      console.log("Base64 начало:", audioContent.substring(0, 50));

      const response = await axios.post(
        `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_SPEECH_API_KEY}`,
        {
          config: {
            encoding: "AMR",
            sampleRateHertz: 8000,
            languageCode: "ar-x-gulf",
            enableAutomaticPunctuation: true,
            audioChannelCount: 1,
            speechContexts: [
              {
                phrases: [
                  "بسم الله الرحمن الرحيم",
                  "قل أعوذ برب الناس",
                  "ملك الناس",
                  "إله الناس",
                  "من شر الوسواس الخناس",
                  "الذي يوسوس في صدور النас",
                  "من الجنة والناس",
                  "الحمد لله رب العالمين",
                  "الرحمن الرحيم",
                  "مالك يوم الدين",
                ],
              },
            ],
          },
          audio: {
            content: audioContent,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("API response:", JSON.stringify(response.data, null, 2));
      const recognized =
        response.data.results?.[0]?.alternatives?.[0]?.transcript || "";
      console.log("Распознанный текст:", recognized);

      if (!recognized) {
        setRecognizedSurah(t("QuranRecognitionScreen.textNotRecognized"));
        setRecognizedText("");
      } else {
        setRecognizedText(recognized);

        const surah = await findSurahByText(recognized);
        setRecognizedSurah(
          surah
            ? {
                englishName: surah.englishName,
                arabicName: surah.name,
                number: surah.number,
              }
            : t("QuranRecognitionScreen.surahNotFound")
        );
      }
      setIsSearching(false);
    } catch (error) {
      console.error(
        "Ошибка распознавания:",
        error.response?.data?.error || error.message
      );
      setRecognizedSurah(
        t("QuranRecognitionScreen.recognitionError") +
          (error.message || t("QuranRecognitionScreen.unknownError"))
      );
      setRecognizedText("");
      setIsSearching(false);
    }
  };

  const findSurahByText = async (text) => {
    if (!text) return null;
    try {
      const normalizeText = (input) =>
        input
          .replace(/[.,\/#!$%\^&\*;:{}=\-_~()]/g, "")
          .replace(
            /[\u064B-\u065F\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06EF]/g,
            ""
          )
          .replace(/ٱ/g, "ا")
          .replace(/إ/g, "ا")
          .replace(/أ/g, "ا")
          .replace(/آ/g, "ا")
          .replace(/ء/g, "")
          .replace(/ّ/g, "")
          .replace(/\s+/g, " ")
          .replace("بسم الله الرحمن الرحيم", "")
          .trim();

      const normalizedText = normalizeText(text);
      const words = normalizedText.split(" ");
      const ayahs = await db.getAllAsync(
        "SELECT surah_number, text FROM ayahs"
      );
      const surahTexts = new Map();

      for (const ayah of ayahs) {
        const surahNumber = ayah.surah_number;
        const currentText = surahTexts.get(surahNumber) || "";
        surahTexts.set(surahNumber, currentText + " " + ayah.text);
      }

      const surahMatches = new Map();
      for (let len = 3; len >= 1; len--) {
        for (let i = 0; i <= words.length - len; i++) {
          const phrase = words.slice(i, i + len).join(" ");
          if (!phrase) continue;

          for (const [surahNumber, surahText] of surahTexts) {
            const normalizedSurahText = normalizeText(surahText);
            if (normalizedSurahText.includes(phrase)) {
              const currentMatches = surahMatches.get(surahNumber) || {
                count: 0,
              };
              currentMatches.count += len;
              surahMatches.set(surahNumber, currentMatches);
            }
          }

          console.log(`Поиск фразы "${phrase}":`, surahMatches);
        }
      }

      let bestSurahNumber = null;
      let bestMatchScore = 0;
      for (const [surahNumber, matches] of surahMatches) {
        if (matches.count > bestMatchScore) {
          bestMatchScore = matches.count;
          bestSurahNumber = surahNumber;
        }
      }

      if (bestSurahNumber) {
        const surah = await db.getFirstAsync(
          "SELECT englishName, name, number FROM surahs WHERE number = ?",
          [bestSurahNumber]
        );
        console.log("Найденная сура:", surah);
        return surah;
      }
      return null;
    } catch (error) {
      console.error("Ошибка поиска в базе:", error);
      return null;
    }
  };

  const handleSurahPress = (surah) => {
    if (surah && typeof surah === "object" && surah.number) {
      navigation.navigate("Quran", { surahNumber: surah.number });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.micButtonContainer}>
        <TouchableOpacity
          style={styles.outerCircle}
          onPress={recording ? stopRecording : startRecording}
          disabled={isSearching}
        >
          <View style={styles.innerCircle}>
            <Text style={styles.micIcon}>🎙️</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.textContainer}>
        {!isListening && !recognizedText && !recognizedSurah && (
          <Text style={styles.promptText}>
            {t("QuranRecognitionScreen.pressToSearch") || "Нажмите для поиска"}
          </Text>
        )}

        {isListening && (
          <Text style={styles.listeningText}>
            {t("QuranRecognitionScreen.listening") || "Слушаю..."}
          </Text>
        )}

        {isSearching && (
          <Text style={styles.searchingText}>
            {t("QuranRecognitionScreen.searching") || "Поиск суры..."}
          </Text>
        )}

        {recognizedSurah && (
          <View style={styles.resultContainer}>
            {typeof recognizedSurah === "object" ? (
              <TouchableOpacity
                onPress={() => handleSurahPress(recognizedSurah)}
              >
                <Text style={styles.surahName}>
                  {`${recognizedSurah.englishName} (${recognizedSurah.arabicName})`}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.surahName}>{recognizedSurah}</Text>
            )}
            {recognizedText && (
              <Text style={styles.excerptText}>{recognizedText}</Text>
            )}
          </View>
        )}
      </View>

      <BottomMenu navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1422",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 0,
  },
  micButtonContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  outerCircle: {
    width: "60%",
    aspectRatio: 1,
    borderRadius: 9999,
    backgroundColor: "#1D6BA8",
    justifyContent: "center",
    alignItems: "center",
  },
  innerCircle: {
    width: "70%",
    aspectRatio: 1,
    borderRadius: 9999,
    backgroundColor: "#54A9EA",
    justifyContent: "center",
    alignItems: "center",
  },
  micIcon: {
    fontSize: 50,
    color: "#FFFFFF",
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 20,
    paddingTop: 40,
  },
  promptText: {
    fontSize: 20,
    color: "#FFFFFF",
    marginBottom: 10,
    textAlign: "center",
  },
  listeningText: {
    fontSize: 20,
    color: "#FFFFFF",
    marginBottom: 10,
    textAlign: "center",
  },
  searchingText: {
    fontSize: 20,
    color: "#FFFFFF",
    marginBottom: 10,
    textAlign: "center",
  },
  resultContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  surahName: {
    fontSize: 22,
    color: "#FFFFFF",
    fontWeight: "bold",
    marginBottom: 10,
    textDecorationLine: "underline",
  },
  excerptText: {
    fontSize: 18,
    color: "#FFFFFF",
    writingDirection: "rtl",
    textAlign: "center",
  },
  bottomMenu: {
    width: "100%",
    backgroundColor: "#124C79",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 40,
    justifyContent: "space-between",
    alignItems: "center",
  },
});

export default QuranRecognitionScreen;
