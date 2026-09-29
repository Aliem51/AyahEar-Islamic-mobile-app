import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
} from "react-native";
import * as Location from "expo-location";
import { Magnetometer } from "expo-sensors";
import BottomMenu from "./BottomMenu";
import { useTranslation } from "react-i18next"; // Импортируем useTranslation

const { width } = Dimensions.get("window");

const QiblaScreen = () => {
  const { t } = useTranslation(); // Получаем функцию перевода
  const [location, setLocation] = useState(null);
  const [qiblaDirection, setQiblaDirection] = useState(null);
  const [distanceToKaaba, setDistanceToKaaba] = useState(null);
  const [heading, setHeading] = useState(0);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const compassRotation = useRef(new Animated.Value(0)).current;

  // Координаты Каабы
  const KAABA_LATITUDE = 21.4225;
  const KAABA_LONGITUDE = 39.8262;

  // Получение местоположения и вычисление Киблы
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError(t("QiblaScreen.error", { message: t("common.error") }));
        setIsLoading(false);
        return;
      }

      try {
        let loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(loc);

        if (loc && loc.coords) {
          const { latitude, longitude } = loc.coords;
          const qiblaAngle = calculateQiblaDirection(
            latitude,
            longitude,
            KAABA_LATITUDE,
            KAABA_LONGITUDE
          );
          const distance = calculateDistance(
            latitude,
            longitude,
            KAABA_LATITUDE,
            KAABA_LONGITUDE
          );
          setQiblaDirection(qiblaAngle);
          setDistanceToKaaba(distance);
          console.log("Qibla Direction:", qiblaAngle, "Distance:", distance); // Для отладки
          console.log("Location:", latitude, longitude); // Для отладки
        } else {
          setError(
            t("QiblaScreen.error", { message: "Failed to get coordinates." })
          );
        }
      } catch (e) {
        setError(t("QiblaScreen.error", { message: e.message }));
        console.error("Geolocation error:", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [t]);

  // Получение направления устройства
  useEffect(() => {
    let headingSubscription = null;
    let magnetometerSubscription = null;

    const startHeading = async () => {
      try {
        headingSubscription = await Location.watchHeadingAsync((data) => {
          const angle =
            data.trueHeading >= 0 ? data.trueHeading : data.magHeading;
          setHeading(angle);
          Animated.timing(compassRotation, {
            toValue: -angle,
            duration: 100,
            useNativeDriver: true,
          }).start();
        });
      } catch (e) {
        console.log("watchHeadingAsync не работает, пробуем магнитометр:", e);
        startMagnetometer();
      }
    };

    const startMagnetometer = async () => {
      const available = await Magnetometer.isAvailableAsync();
      if (!available) {
        setError(
          (prev) =>
            prev || t("QiblaScreen.error", { message: t("common.error") })
        );
        return;
      }

      magnetometerSubscription = Magnetometer.addListener((data) => {
        const { x, y } = data;
        let angle = Math.atan2(y, x) * (180 / Math.PI);
        angle = (angle + 360) % 360;

        setHeading(angle);
        Animated.timing(compassRotation, {
          toValue: -angle,
          duration: 100,
          useNativeDriver: true,
        }).start();
        console.log("Magnetometer angle:", angle);
      });

      Magnetometer.setUpdateInterval(100);
    };

    startHeading();

    return () => {
      if (headingSubscription) headingSubscription.remove();
      if (magnetometerSubscription) magnetometerSubscription.remove();
    };
  }, [t]);

  // Вычисление направления Киблы
  const calculateQiblaDirection = (lat1, lon1, lat2, lon2) => {
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const lat1Rad = lat1 * (Math.PI / 180);
    const lat2Rad = lat2 * (Math.PI / 180);

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    let angle = Math.atan2(y, x) * (180 / Math.PI);
    return (angle + 360) % 360;
  };

  // Вычисление расстояния (формула гаверсинуса)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Радиус Земли в км
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Проверка совпадения с Киблой
  const isAligned = qiblaDirection
    ? Math.abs((heading - qiblaDirection + 360) % 360) < 5
    : false;

  // Интерполяция вращения компаса
  const compassRotationStyle = compassRotation.interpolate({
    inputRange: [-360, 0, 360],
    outputRange: ["-360deg", "0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      {/* Информация */}
      <View style={styles.infoContainer}>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : isLoading ? (
          <Text style={styles.infoText}>{t("QiblaScreen.loading")}</Text>
        ) : qiblaDirection !== null && distanceToKaaba !== null ? (
          <>
            <Text style={styles.infoText}>
              {t("QiblaScreen.qiblaDirection")}: {qiblaDirection.toFixed(1)}°
            </Text>
            <Text style={styles.infoText}>
              {t("QiblaScreen.distanceToKaaba")} {distanceToKaaba.toFixed(1)} km
            </Text>
          </>
        ) : (
          <Text style={styles.errorText}>
            {t("QiblaScreen.error", { message: "Qibla data unavailable" })}
          </Text>
        )}
      </View>

      {/* Компас */}
      <View style={styles.compassContainer}>
        <Animated.View
          style={[
            styles.compassBackground,
            { transform: [{ rotate: compassRotationStyle }] },
          ]}
        >
          {[...Array(36)].map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  transform: [
                    { rotate: `${index * 10}deg` },
                    { translateY: -120 },
                  ],
                  height: index % 9 === 0 ? 14 : index % 3 === 0 ? 10 : 6,
                },
              ]}
            />
          ))}
          <Text style={[styles.directionText, styles.north]}>N</Text>
          <Text style={[styles.directionText, styles.south]}>S</Text>
          <Text style={[styles.directionText, styles.east]}>E</Text>
          <Text style={[styles.directionText, styles.west]}>W</Text>
          {/* Qibla Indicator on Compass */}
          {qiblaDirection !== null && (
            <View
              style={[
                styles.qiblaIndicator,
                {
                  transform: [
                    { rotate: `${qiblaDirection}deg` },
                    { translateY: -120 },
                  ],
                },
              ]}
            >
              <View
                style={[
                  styles.qiblaTriangle,
                  { borderBottomColor: isAligned ? "#00DF4B" : "#FF6B6B" },
                ]}
              />
              <Text style={styles.qiblaText}>🕋</Text>
            </View>
          )}
        </Animated.View>
        {/* Fixed Marker for Device Heading */}
        <View style={styles.headingMarker}>
          <View style={styles.headingTriangle} />
        </View>
      </View>

      <BottomMenu />
    </View>
  );
};

// Стили
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1422",
  },
  infoContainer: {
    marginTop: 20,
    marginHorizontal: 20,
    padding: 15,
    backgroundColor: "#1E2A3F",
    borderRadius: 10,
    alignItems: "center",
  },
  infoText: {
    color: "white",
    fontSize: 18,
    marginBottom: 5,
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 16,
    textAlign: "center",
  },
  successText: {
    color: "#00DF4B",
    fontSize: 16,
    marginTop: 5,
  },
  compassContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  compassBackground: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#2E3A59",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  qiblaIndicator: {
    position: "absolute",
    alignItems: "center",
  },
  qiblaTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 24,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#FF6B6B",
  },
  qiblaText: {
    fontSize: 20,
    color: "white",
    marginTop: 5,
  },
  headingMarker: {
    position: "absolute",
    alignItems: "center",
    top: 10,
  },
  headingTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 16,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "white",
  },
  directionText: {
    position: "absolute",
    fontSize: 20,
    color: "white",
    fontWeight: "bold",
  },
  north: { top: 10 },
  south: { bottom: 10 },
  east: { right: 10 },
  west: { left: 10 },
  dot: {
    position: "absolute",
    width: 5,
    borderRadius: 2.5,
    backgroundColor: "white",
  },
});

export default QiblaScreen;
