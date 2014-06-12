var FilterStorage = require("filterStorage").FilterStorage;
var ElemHide = require("elemHide").ElemHide;
var defaultMatcher = require("matcher").defaultMatcher;
var Prefs = require("prefs").Prefs;
var Synchronizer = require("synchronizer").Synchronizer;
var Utils = require("utils").Utils;
var Notification = require("notification").Notification;

function removeDeprecatedOptions()
{
  var deprecatedOptions = ["specialCaseYouTube", "experimental", "disableInlineTextAds"];
  deprecatedOptions.forEach(function(option)
  {
    if (option in localStorage)
      delete localStorage[option];
  });
}

// Remove deprecated options before we do anything else.
removeDeprecatedOptions();

var activeNotification = null;

// Adds or removes browser action icon according to options.
function refreshIconAndContextMenu(tab)
{
  if(!/^https?:/.test(tab.url))
    return;

  var iconFilename;
  iconFilename = "icons/tf-19.png";

  tab.browserAction.setIcon(iconFilename);
  ext.contextMenus.showMenuItems();
}

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

function prepareNotificationIconAndPopup()
{
  activeNotification.onClicked = function()
  {
    activeNotification = null;
  };
}

function showNotification(notification)
{
  activeNotification = notification;

  if (activeNotification.severity === "critical"
      && typeof webkitNotifications !== "undefined")
  {
    var notification = webkitNotifications.createHTMLNotification("notification.html");
    notification.show();
    notification.addEventListener("close", prepareNotificationIconAndPopup);
  }
  else
    prepareNotificationIconAndPopup();
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
    case "add-filters":
      if (msg.filters && msg.filters.length)
      {
        for (var i = 0; i < msg.filters.length; i++)
          FilterStorage.addFilter(Filter.fromText(msg.filters[i]));
      }
      break;
    case "add-subscription":
      openOptions(function(tab)
      {
        tab.sendMessage(msg);
      });
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

// Show icon as browser action for all tabs that already exist
ext.windows.getAll(function(windows)
{
  for (var i = 0; i < windows.length; i++)
  {
    windows[i].getAllTabs(function(tabs)
    {
      tabs.forEach(refreshIconAndContextMenu);
    });
  }
});

// Update icon if a tab changes location
ext.tabs.onLoading.addListener(function(tab)
{
  tab.sendMessage({type: "clickhide-deactivate"});
  refreshIconAndContextMenu(tab);
});

setTimeout(function()
{
  var notificationToShow = Notification.getNextToShow();
  if (notificationToShow)
    showNotification(notificationToShow);
}, 3 * 60 * 1000);
