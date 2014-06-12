var ElemHide = require("elemHide").ElemHide;
//var defaultMatcher = require("matcher").defaultMatcher;
var Prefs = require("prefs").Prefs;
var Utils = require("utils").Utils;

var activeNotification = null;

function setContextMenu()
{
  if (Prefs.shouldShowBlockElementMenu)
  {
    // Register context menu item
    ext.contextMenus.addMenuItem(ext.i18n.getMessage("block_element"), ["image", "video", "audio"], function(srcUrl, tab)
    {
      if (srcUrl)
        tab.sendMessage({type: "clickhide-new-filter", filter: srcUrl});
    });
  }
  else
    ext.contextMenus.removeMenuItems();
}

Prefs.addListener(function(name)
{
  if (name == "shouldShowBlockElementMenu")
    setContextMenu();
});
setContextMenu();

/**
  * Opens options tab or focuses an existing one, within the last focused window.
  * @param {Function} callback  function to be called with the
                                Tab object of the options tab
  */
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
    case "get-selectors":
      var selectors = null;

      if (false)
      {
        var noStyleRules = false;
        var host = extractHostFromURL(sender.frame.url);
        for (var i = 0; i < noStyleRulesHosts.length; i++)
        {
          var noStyleHost = noStyleRulesHosts[i];
          if (host == noStyleHost || (host.length > noStyleHost.length &&
                                      host.substr(host.length - noStyleHost.length - 1) == "." + noStyleHost))
          {
            noStyleRules = true;
          }
        }
        selectors = ElemHide.getSelectorsForDomain(host, false);
        if (noStyleRules)
        {
          selectors = selectors.filter(function(s)
          {
            return !/\[style[\^\$]?=/.test(s);
          });
        }
      }

      sendResponse(selectors);
      break;
    case "should-collapse":
        sendResponse(false);
      break;
    case "get-domain-enabled-state":
      // Returns whether this domain is in the exclusion list.
      // The browser action popup asks us this.
      if(sender.tab)
      {
        sendResponse({enabled: !isWhitelisted(sender.tab.url)});
        return;
      }
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


setTimeout(function()
{
  var notificationToShow = Notification.getNextToShow();
  if (notificationToShow)
    showNotification(notificationToShow);
}, 3 * 60 * 1000);