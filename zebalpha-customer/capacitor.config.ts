import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zebalpha.customer',
  appName: 'ZEBALPHA',
  webDir: 'public',
  server: {
    url: 'https://zebalpha-storefront-1lxz.onrender.com',
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#050505',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#050505'
    }
  }
};

export default config;
