var backgroundPage = ext.backgroundPage.getWindow();
var imports = ["require", "extractHostFromURL", "refreshIconAndContextMenu", "openOptions"];
for (var i = 0; i < imports.length; i++)
  window[imports[i]] = backgroundPage[imports[i]];

var tab = null;

function init()
{
  // Mark page as local to hide non-relevant elements
  ext.windows.getLastFocused(function(win)
  {
    win.getActiveTab(function(tab)
    {
      if (!/^https?:\/\//.exec(tab.url))
        document.body.classList.add("local");
    });
  });

  document.getElementById("clickhide").addEventListener("click", activateClickHide, false);
  document.getElementById("clickhide-cancel").addEventListener("click", cancelClickHide, false);

  ext.windows.getLastFocused(function(win)
  {
    win.getActiveTab(function(t)
    {
      tab = t;

      tab.sendMessage({type: "get-clickhide-state"}, function(response)
      {
        if (response && response.active)
          document.body.classList.add("clickhide-active");
      });
    });
  });
}
window.addEventListener("DOMContentLoaded", init, false);

function activateClickHide()
{
  document.body.classList.add("clickhide-active");
  tab.sendMessage({type: "clickhide-activate"});
  activateClickHide.timeout = window.setTimeout(ext.closePopup, 5000);
}

function cancelClickHide()
{
  if (activateClickHide.timeout)
  {
    window.clearTimeout(activateClickHide.timeout);
    activateClickHide.timeout = null;
  }
  document.body.classList.remove("clickhide-active");
  tab.sendMessage({type: "clickhide-deactivate"});
}