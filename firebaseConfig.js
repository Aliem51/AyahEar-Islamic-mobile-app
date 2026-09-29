import { initializeApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { getMessaging } from "@react-native-firebase/messaging";
import { getFirestore } from "@react-native-firebase/firestore";

// Инициализация приложения (автоматически через google-services.json, но можно явно указать)
const app = initializeApp();

// Экспортируем модули
const auth = getAuth(app);
const messaging = getMessaging(app);
const firestore = getFirestore(app);

export { auth, messaging, firestore };
