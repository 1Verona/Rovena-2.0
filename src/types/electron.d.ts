export { };

declare global {
    interface Window {
        electronAPI: {
            getAppVersion: () => Promise<string>;
            getPlatform: () => Promise<string>;
            checkForUpdates: () => Promise<void>;
            startDownload: () => Promise<void>;
            onUpdateStatus: (callback: (status: any) => void) => void;
            onUpdateError: (callback: (error: string) => void) => void;
            removeUpdateStatusListener: (callback: (status: any) => void) => void;
            removeUpdateErrorListener: (callback: (error: string) => void) => void;
            quitAndInstall: () => Promise<void>;
            getLatestReleaseUrl: () => Promise<any>;
            openExternalUrl: (url: string) => Promise<boolean>;
        };
    }
}
