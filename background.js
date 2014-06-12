var ElemHide = require("elemHide").ElemHide;
var Prefs = require("prefs").Prefs;
var Utils = require("utils").Utils;

var activeNotification = null;

function setContextMenu()
{
  if (true)
  {
    ext.contextMenus.addMenuItem("block_element", ["image", "video", "audio"], function(srcUrl, tab)
    {
      if (srcUrl)
        tab.sendMessage({type: "clickhide-new-filter", filter: srcUrl});
    });
  }
}

Prefs.addListener(function(name)
{
  if (name == "shouldShowBlockElementMenu")
    setContextMenu();
});
setContextMenu();

function openOptions(callback)
{
  ext.windows.getLastFocused(function(win)
  {
    win.getAllTabs(function(tabs)
    {
      var optionsUrl = ext.getURL("options.html");

      for (var i = 0; i < tabs.length; i++)
      {
        if (tabs[i].url == optionsUrl)
        {
          tabs[i].activate();
          if (callback)
            callback(tabs[i]);
          return;
        }
      }

      win.openTab(optionsUrl, callback && function(tab)
      {
        tab.onCompleted.addListener(callback);
      });
    });
  });
}

ext.onMessage.addListener(function (msg, sender, sendResponse)
{
  switch (msg.type)
  {
    case "should-collapse":
        sendResponse(false);
      break;
    case "add-key-exception":
      processKeyException(msg.token, sender.tab, sender.frame);
      break;
    case "forward":
      if (sender.tab)
      {
        sender.tab.sendMessage(msg.payload, sendResponse);
        // Return true to indicate that we want to call
        // sendResponse asynchronously
        return true;
      }
      break;
    case "getCurrTab":
      chrome.tabs.getSelected(null,function(tab)
      {
        console.log(tab.url);
         if(tab.url!=null)
         {
            localStorage.setItem("storedUrl",tab.url);
            sendResponse(tab.url);
         }
         else
            sendResponse("none");
      });
      break;
    default:
      sendResponse({});
      break;
  }
});