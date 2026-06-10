import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.noctis.gourmetapp',
  appName: 'Bora Comer',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    // Não habilitar CapacitorHttp globalmente — quebra Firestore no Android/iOS.
    // Use nativeFetch() em chamadas externas (OpenAI) quando necessário.
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#FFF8F2",
      androidSplashResourceName: "splash",
      androidScaleType: "FIT_CENTER",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;
