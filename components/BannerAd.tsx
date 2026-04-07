
import React, { useEffect } from 'react';
import { AdMob, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

const BannerAd: React.FC = () => {
  useEffect(() => {
    const showBanner = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await AdMob.showBanner({
            adId: 'ca-app-pub-3940256099942544/6300978111', // Test Ad ID
            adSize: BannerAdSize.ADAPTIVE_BANNER,
            position: BannerAdPosition.BOTTOM_CENTER,
            margin: 0,
            isTesting: true
          });
        } catch (e) {
          console.warn("Banner show failed", e);
        }
      }
    };

    showBanner();

    // Hide banner when leaving the dashboard to keep the UI clean
    return () => {
      if (Capacitor.isNativePlatform()) {
        AdMob.hideBanner().catch(err => console.warn("Banner hide failed", err));
      }
    };
  }, []);

  return null; // Don't render anything in the web UI, the banner is a native overlay
};

export default BannerAd;
