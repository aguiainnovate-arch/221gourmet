import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.noctis.gourmetapp',
  appName: 'Bora Comer',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // Origem HTTPS de domínio autorizado do Firebase. localhost no WKWebView
    // quebra o RecaptchaVerifier (auth/internal-error no Phone Auth).
    hostname: 'gourmet-9ebe6.firebaseapp.com',
  },
  plugins: {
    // Não habilitar CapacitorHttp globalmente — quebra Firestore no Android/iOS.
    // Use nativeFetch() em chamadas externas (OpenAI) quando necessário.
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#FFF8F2",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;
