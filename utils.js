var backgroundPage = ext.backgroundPage.getWindow();
var require = backgroundPage.require;
var Services = backgroundPage.Services;
var Utils = require("utils").Utils;
var Prefs = require("prefs").Prefs;
function E(id)
{
  return document.getElementById(id);
}
