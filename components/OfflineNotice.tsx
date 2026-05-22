"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

type AppExitNavigator = Navigator & {
  app?: {
    exitApp?: () => void;
  };
};

type AppExitWindow = Window & {
  Android?: {
    closeApp?: () => void;
    exitApp?: () => void;
  };
  Capacitor?: {
    Plugins?: {
      App?: {
        exitApp?: () => void | Promise<void>;
      };
    };
  };
};

export default function OfflineNotice() {
  const [isOffline, setIsOffline] = useState(false);
  const [showTapMessage, setShowTapMessage] = useState(false);
  const [showCloseHelp, setShowCloseHelp] = useState(false);

  useEffect(() => {
    function updateNetworkStatus() {
      setIsOffline(!navigator.onLine);
      if (navigator.onLine) {
        setShowTapMessage(false);
        setShowCloseHelp(false);
      }
    }

    updateNetworkStatus();
    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);

    return () => {
      window.removeEventListener("online", updateNetworkStatus);
      window.removeEventListener("offline", updateNetworkStatus);
    };
  }, []);

  if (!isOffline) return null;

  function showOfflineMessage() {
    setShowTapMessage(true);
  }

  function closeApp() {
    setShowCloseHelp(false);

    const appWindow = window as AppExitWindow;
    const appNavigator = window.navigator as AppExitNavigator;

    try {
      appNavigator.app?.exitApp?.();
      appWindow.Android?.closeApp?.();
      appWindow.Android?.exitApp?.();
      void appWindow.Capacitor?.Plugins?.App?.exitApp?.();

      window.open("", "_self");
      window.close();
    } finally {
      window.setTimeout(() => setShowCloseHelp(true), 250);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4"
      onClick={showOfflineMessage}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="offline-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-amber-300 bg-amber-50 p-5 text-center text-amber-950 shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <WifiOff size={24} />
        </div>
        <p id="offline-title" className="mt-3 text-lg font-bold leading-tight">No internet connection</p>
        <p className="mt-2 text-sm font-semibold leading-relaxed" dir="rtl">
          انٹرنیٹ بند ہے۔ براہ کرم کنکشن چیک کریں۔
        </p>
        {showTapMessage && (
          <p className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-sm font-bold leading-relaxed text-amber-900" dir="rtl">
            ایپ استعمال کرنے کے لیے انٹرنیٹ ضروری ہے۔
          </p>
        )}
        {showCloseHelp && (
          <p className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-sm font-bold leading-relaxed text-amber-900">
            Use your phone Back button or app switcher to close the app.
          </p>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            closeApp();
          }}
          className="mt-5 min-h-11 w-full rounded-xl bg-amber-700 px-4 py-2 text-sm font-bold text-white active:bg-amber-800"
        >
          Close App
        </button>
      </div>
    </div>
  );
}
