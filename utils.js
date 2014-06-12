var backgroundPage = ext.backgroundPage.getWindow();
var require = backgroundPage.require;

var Services = backgroundPage.Services;
//var Synchronizer = require("synchronizer").Synchronizer;
var Utils = require("utils").Utils;
var Prefs = require("prefs").Prefs;

//var defaultMatcher = require("matcher").defaultMatcher;

function E(id)
{
  return document.getElementById(id);
}
