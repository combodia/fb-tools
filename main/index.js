import FBTools from './fbtools.js';
const mainWindow = nw.Window.get();
const tools = new FBTools(mainWindow);

tools.loadSetting(document.querySelector('form#setting'));

mainWindow.on('close', ()=>{
    nw.App.quit();
});
console.log(tools);


chrome.webRequest.onBeforeRequest.addListener( details=>{
    return { cancel: true }
},{
    urls: [
        "http://*/*",
        "https://*/*"
    ],
    types:[
        "image", "stylesheet"
    ]
}, ["blocking"]);
// mainWindow.showDevTools();