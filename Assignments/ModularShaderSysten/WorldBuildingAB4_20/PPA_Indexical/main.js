const { app, BrowserWindow } = require('electron');

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        autoHideMenuBar: true
    });
    mainWindow.webContents.setWindowOpenHandler((details) => {
        if (details.url.includes('projector.html')) {
            return {
                action: 'allow',
                overrideBrowserWindowOptions: {
                    frame: false,
                    autoHideMenuBar: true,
                    alwaysOnTop: false,
                    width: 1280,
                    height: 720,
                    backgroundColor: '#000000'
                }
            };
        }
        return { action: 'allow' };
    });

    // This tells the window to load your visualizer
    mainWindow.loadFile('index.html');
};

app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});