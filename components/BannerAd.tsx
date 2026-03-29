
import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle: any;
  }
}

const BannerAd: React.FC = () => {
  const adRef = useRef<HTMLModElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !adRef.current) return;

    const initAd = () => {
      try {
        if (window.adsbygoogle && adRef.current && adRef.current.offsetWidth > 0 && !initialized.current) {
          const isLoaded = adRef.current.getAttribute('data-adsbygoogle-status') === 'done';
          if (!isLoaded) {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            initialized.current = true;
          }
        }
      } catch (e) {
        console.warn("AdMob initialization skipped:", e);
      }
    };

    // ResizeObserver ensures we only trigger the ad when the container actually has dimensions
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          initAd();
          observer.disconnect(); // Only need to initialize once
        }
      }
    });

    observer.observe(adRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full px-2 py-4 mt-auto">
      <div className="bg-white border border-slate-100 rounded-[2rem] p-4 shadow-sm overflow-hidden min-h-[120px] flex flex-col items-center justify-center">
        <ins 
             ref={adRef}
             className="adsbygoogle"
             style={{ display: 'block', width: '100%', minWidth: '250px', height: '90px' }}
             data-ad-client="ca-pub-8836157496388061"
             data-ad-slot="2625808384"
             data-ad-format="horizontal"
             data-full-width-responsive="true"></ins>
        
        <p className="text-[7px] text-center text-slate-300 font-bold uppercase tracking-[0.2em] mt-2">
          Advertisement • Secure Digital Signature Platform
        </p>
      </div>
    </div>
  );
};

export default BannerAd;
