import FBTools from './fbtools.js';
const mainWindow = nw.Window.get();
const tools = new FBTools(mainWindow);

tools.loadSetting(document.querySelector('form#setting'));

console.log(tools);
// mainWindow.showDevTools();