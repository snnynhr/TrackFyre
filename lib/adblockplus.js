require.scopes["prefs"] = (function()
{
  var exports = {};
  var defaults =
  {
    __proto__: null,
    enabled: true,
    data_directory: "",
    patternsbackups: 5,
    patternsbackupinterval: 24,
    savestats: false,
    privateBrowsing: false,
    shouldShowBlockElementMenu: true,
    hidePlaceholders: true
  };
  var listeners = [];

  function defineProperty(key)
  {
    var value = null;
    Prefs.__defineGetter__(key, function()
    {
      if (value === null)
      {
        if (key in localStorage)
        {
          try
          {
            value = JSON.parse(localStorage[key]);
          }
          catch (e)
          {
            Cu.reportError(e);
          }
        }
        if (value === null)
        {
          value = JSON.parse(JSON.stringify(defaults[key]));
        }
      }
      return value;
    });
    Prefs.__defineSetter__(key, function(newValue)
    {
      if (typeof newValue != typeof defaults[key])
      {
        throw new Error("Attempt to change preference type");
      }
      var stringified = JSON.stringify(newValue);
      if (stringified != JSON.stringify(defaults[key]))
      {
        localStorage[key] = stringified;
      }
      else
      {
        delete localStorage[key];
      }
      value = newValue;
      for (var _loopIndex0 = 0; _loopIndex0 < listeners.length; ++_loopIndex0)
      {
        var listener = listeners[_loopIndex0];
        listener(key);
      }
      return value;
    });
  }
  var Prefs = exports.Prefs =
  {
    addListener: function(listener)
    {
      if (listeners.indexOf(listener) < 0)
      {
        listeners.push(listener);
      }
    },
    removeListener: function(listener)
    {
      var index = listeners.indexOf(listener);
      if (index >= 0)
      {
        listeners.splice(index, 1);
      }
    }
  };
  for (var key in defaults)
  {
    defineProperty(key);
  }
  return exports;
})();
require.scopes["utils"] = (function()
{
  var exports = {};
  var runAsyncQueue;
  var Utils = exports.Utils =
  {
    systemPrincipal: null,
    getString: function(id)
    {
      return id;
    },
    runAsync: function(callback)
    {
      callback = callback.bind.apply(callback, Array.prototype.slice.call(arguments, 1));
      if (typeof runAsyncQueue == "undefined")
      {
        runAsyncQueue = document.readyState == "loading" ? [] : null;
        if (runAsyncQueue)
        {
          var loadHandler = function()
          {
            document.removeEventListener("DOMContentLoaded", loadHandler, false);
            var queue = runAsyncQueue;
            runAsyncQueue = null;
            for (var _loopIndex1 = 0; _loopIndex1 < queue.length; ++_loopIndex1)
            {
              var callback = queue[_loopIndex1];
              try
              {
                callback();
              }
              catch (e)
              {
                Cu.reportError(e);
              }
            }
          };
          document.addEventListener("DOMContentLoaded", loadHandler, false);
        }
      }
      if (runAsyncQueue)
      {
        runAsyncQueue.push(callback);
      }
      else
      {
        window.setTimeout(callback, 0);
      }
    },
    get appLocale()
    {
      var locale = ext.i18n.getMessage("@@ui_locale").replace(/_/g, "-");
      this.__defineGetter__("appLocale", function()
      {
        return locale;
      });
      return this.appLocale;
    },
    generateChecksum: function(lines)
    {
      return null;
    },
    makeURI: function(url)
    {
      return Services.io.newURI(url);
    },
    checkLocalePrefixMatch: function(prefixes)
    {
      if (!prefixes)
      {
        return null;
      }
      var list = prefixes.split(",");
      for (var i = 0; i < list.length; i++)
      {
        if ((new RegExp("^" + list[i] + "\\b")).test(this.appLocale))
        {
          return list[i];
        }
      }
      return null;
    },
    chooseFilterSubscription: function(subscriptions)
    {
      var selectedItem = null;
      var selectedPrefix = null;
      var matchCount = 0;
      for (var i = 0; i < subscriptions.length; i++)
      {
        var subscription = subscriptions[i];
        if (!selectedItem)
        {
          selectedItem = subscription;
        }
        var prefix = require("utils").Utils.checkLocalePrefixMatch(subscription.getAttribute("prefixes"));
        if (prefix)
        {
          if (!selectedPrefix || selectedPrefix.length < prefix.length)
          {
            selectedItem = subscription;
            selectedPrefix = prefix;
            matchCount = 1;
          }
          else if (selectedPrefix && selectedPrefix.length == prefix.length)
          {
            matchCount++;
            if (Math.random() * matchCount < 1)
            {
              selectedItem = subscription;
              selectedPrefix = prefix;
            }
          }
        }
      }
      return selectedItem;
    },
    getDocLink: function(linkID)
    {
      var Prefs = require("prefs").Prefs;
      var docLink = Prefs.documentation_link;
      return docLink.replace(/%LINK%/g, linkID).replace(/%LANG%/g, Utils.appLocale);
    }
  };
  return exports;
})();
require.scopes["elemHideHitRegistration"] = (function()
{
  var exports = {};
  var AboutHandler = exports.AboutHandler = {};
  return exports;
})();

require.scopes["filterNotifier"] = (function()
{
  var exports = {};
  var listeners = [];
  var FilterNotifier = exports.FilterNotifier =
  {
    addListener: function(listener)
    {
      if (listeners.indexOf(listener) >= 0)
      {
        return;
      }
      listeners.push(listener);
    },
    removeListener: function(listener)
    {
      var index = listeners.indexOf(listener);
      if (index >= 0)
      {
        listeners.splice(index, 1);
      }
    },
    triggerListeners: function(action, item, param1, param2, param3)
    {
      for (var _loopIndex4 = 0; _loopIndex4 < listeners.length; ++_loopIndex4)
      {
        var listener = listeners[_loopIndex4];
        listener(action, item, param1, param2, param3);
      }
    }
  };
  return exports;
})();

require.scopes["filterClasses"] = (function()
{
  var exports = {};
  var FilterNotifier = require("filterNotifier").FilterNotifier;

  function Filter(text)
  {
    this.text = text;
    this.subscriptions = [];
  }
  exports.Filter = Filter;
  Filter.prototype =
  {
    text: null,
    subscriptions: null,
    serialize: function(buffer)
    {
      buffer.push("[Filter]");
      buffer.push("text=" + this.text);
    },
    toString: function()
    {
      return this.text;
    }
  };
  Filter.knownFilters =
  {
    __proto__: null
  };
  Filter.elemhideRegExp = /^([^\/\*\|\@"!]*?)#(\@)?(?:([\w\-]+|\*)((?:\([\w\-]+(?:[$^*]?=[^\(\)"]*)?\))*)|#([^{}]+))$/;
  Filter.regexpRegExp = /^(@@)?\/.*\/(?:\$~?[\w\-]+(?:=[^,\s]+)?(?:,~?[\w\-]+(?:=[^,\s]+)?)*)?$/;
  Filter.optionsRegExp = /\$(~?[\w\-]+(?:=[^,\s]+)?(?:,~?[\w\-]+(?:=[^,\s]+)?)*)$/;
  Filter.fromText = function(text)
  {
    if (text in Filter.knownFilters)
    {
      return Filter.knownFilters[text];
    }
    var ret;
    var match = text.indexOf("#") >= 0 ? Filter.elemhideRegExp.exec(text) : null;
    if (match)
    {
      ret = ElemHideBase.fromText(text, match[1], match[2], match[3], match[4], match[5]);
    }
    else if (text[0] == "!")
    {
      ret = new CommentFilter(text);
    }
    else
    {
      ret = RegExpFilter.fromText(text);
    }
    Filter.knownFilters[ret.text] = ret;
    return ret;
  };
  Filter.fromObject = function(obj)
  {
    var ret = Filter.fromText(obj.text);
    if (ret instanceof ActiveFilter)
    {
      if ("disabled" in obj)
      {
        ret._disabled = obj.disabled == "true";
      }
      if ("hitCount" in obj)
      {
        ret._hitCount = parseInt(obj.hitCount) || 0;
      }
      if ("lastHit" in obj)
      {
        ret._lastHit = parseInt(obj.lastHit) || 0;
      }
    }
    return ret;
  };
  Filter.normalize = function(text)
  {
    if (!text)
    {
      return text;
    }
    text = text.replace(/[^\S ]/g, "");
    if (/^\s*!/.test(text))
    {
      return text.replace(/^\s+/, "").replace(/\s+$/, "");
    }
    else if (Filter.elemhideRegExp.test(text))
    {
      var _tempVar5 = /^(.*?)(#\@?#?)(.*)$/.exec(text);
      var domain = _tempVar5[1];
      var separator = _tempVar5[2];
      var selector = _tempVar5[3];
      return domain.replace(/\s/g, "") + separator + selector.replace(/^\s+/, "").replace(/\s+$/, "");
    }
    else
    {
      return text.replace(/\s/g, "");
    }
  };

  function InvalidFilter(text, reason)
  {
    Filter.call(this, text);
    this.reason = reason;
  }
  exports.InvalidFilter = InvalidFilter;
  InvalidFilter.prototype =
  {
    __proto__: Filter.prototype,
    reason: null,
    serialize: function(buffer){}
  };

  function CommentFilter(text)
  {
    Filter.call(this, text);
  }
  exports.CommentFilter = CommentFilter;
  CommentFilter.prototype =
  {
    __proto__: Filter.prototype,
    serialize: function(buffer){}
  };

  function ActiveFilter(text, domains)
  {
    Filter.call(this, text);
    this.domainSource = domains;
  }
  exports.ActiveFilter = ActiveFilter;
  ActiveFilter.prototype =
  {
    __proto__: Filter.prototype,
    _disabled: false,
    _hitCount: 0,
    _lastHit: 0,
    get disabled()
    {
      return this._disabled;
    },
    set disabled(value)
    {
      if (value != this._disabled)
      {
        var oldValue = this._disabled;
        this._disabled = value;
        FilterNotifier.triggerListeners("filter.disabled", this, value, oldValue);
      }
      return this._disabled;
    },
    get hitCount()
    {
      return this._hitCount;
    },
    set hitCount(value)
    {
      if (value != this._hitCount)
      {
        var oldValue = this._hitCount;
        this._hitCount = value;
        FilterNotifier.triggerListeners("filter.hitCount", this, value, oldValue);
      }
      return this._hitCount;
    },
    get lastHit()
    {
      return this._lastHit;
    },
    set lastHit(value)
    {
      if (value != this._lastHit)
      {
        var oldValue = this._lastHit;
        this._lastHit = value;
        FilterNotifier.triggerListeners("filter.lastHit", this, value, oldValue);
      }
      return this._lastHit;
    },
    domainSource: null,
    domainSeparator: null,
    ignoreTrailingDot: true,
    get domains()
    {
      var domains = null;
      if (this.domainSource)
      {
        var list = this.domainSource.split(this.domainSeparator);
        if (list.length == 1 && list[0][0] != "~")
        {
          domains =
          {
            __proto__: null,
            "": false
          };
          if (this.ignoreTrailingDot)
          {
            list[0] = list[0].replace(/\.+$/, "");
          }
          domains[list[0]] = true;
        }
        else
        {
          var hasIncludes = false;
          for (var i = 0; i < list.length; i++)
          {
            var domain = list[i];
            if (this.ignoreTrailingDot)
            {
              domain = domain.replace(/\.+$/, "");
            }
            if (domain == "")
            {
              continue;
            }
            var include;
            if (domain[0] == "~")
            {
              include = false;
              domain = domain.substr(1);
            }
            else
            {
              include = true;
              hasIncludes = true;
            }
            if (!domains)
            {
              domains =
              {
                __proto__: null
              };
            }
            domains[domain] = include;
          }
          domains[""] = !hasIncludes;
        }
        delete this.domainSource;
      }
      this.__defineGetter__("domains", function()
      {
        return domains;
      });
      return this.domains;
    },
    isActiveOnDomain: function(docDomain)
    {
      if (!this.domains)
      {
        return true;
      }
      if (!docDomain)
      {
        return this.domains[""];
      }
      if (this.ignoreTrailingDot)
      {
        docDomain = docDomain.replace(/\.+$/, "");
      }
      docDomain = docDomain.toUpperCase();
      while (true)
      {
        if (docDomain in this.domains)
        {
          return this.domains[docDomain];
        }
        var nextDot = docDomain.indexOf(".");
        if (nextDot < 0)
        {
          break;
        }
        docDomain = docDomain.substr(nextDot + 1);
      }
      return this.domains[""];
    },
    isActiveOnlyOnDomain: function(docDomain)
    {
      if (!docDomain || !this.domains || this.domains[""])
      {
        return false;
      }
      if (this.ignoreTrailingDot)
      {
        docDomain = docDomain.replace(/\.+$/, "");
      }
      docDomain = docDomain.toUpperCase();
      for (var domain in this.domains)
      {
        if (this.domains[domain] && domain != docDomain && (domain.length <= docDomain.length || domain.indexOf("." + docDomain) != domain.length - docDomain.length - 1))
        {
          return false;
        }
      }
      return true;
    },
    serialize: function(buffer)
    {
      if (this._disabled || this._hitCount || this._lastHit)
      {
        Filter.prototype.serialize.call(this, buffer);
        if (this._disabled)
        {
          buffer.push("disabled=true");
        }
        if (this._hitCount)
        {
          buffer.push("hitCount=" + this._hitCount);
        }
        if (this._lastHit)
        {
          buffer.push("lastHit=" + this._lastHit);
        }
      }
    }
  };

  function RegExpFilter(text, regexpSource, contentType, matchCase, domains, thirdParty)
  {
    ActiveFilter.call(this, text, domains);
    if (contentType != null)
    {
      this.contentType = contentType;
    }
    if (matchCase)
    {
      this.matchCase = matchCase;
    }
    if (thirdParty != null)
    {
      this.thirdParty = thirdParty;
    }
    if (regexpSource.length >= 2 && regexpSource[0] == "/" && regexpSource[regexpSource.length - 1] == "/")
    {
      var regexp = new RegExp(regexpSource.substr(1, regexpSource.length - 2), this.matchCase ? "" : "i");
      this.__defineGetter__("regexp", function()
      {
        return regexp;
      });
    }
    else
    {
      this.regexpSource = regexpSource;
    }
  }
  exports.RegExpFilter = RegExpFilter;
  RegExpFilter.prototype =
  {
    __proto__: ActiveFilter.prototype,
    length: 1,
    domainSeparator: "|",
    regexpSource: null,
    get regexp()
    {
      var source = this.regexpSource.replace(/\*+/g, "*").replace(/\^\|$/, "^").replace(/\W/g, "\\$&").replace(/\\\*/g, ".*").replace(/\\\^/g, "(?:[\\x00-\\x24\\x26-\\x2C\\x2F\\x3A-\\x40\\x5B-\\x5E\\x60\\x7B-\\x7F]|$)").replace(/^\\\|\\\|/, "^[\\w\\-]+:\\/+(?!\\/)(?:[^\\/]+\\.)?").replace(/^\\\|/, "^").replace(/\\\|$/, "$").replace(/^(\.\*)/, "").replace(/(\.\*)$/, "");
      var regexp = new RegExp(source, this.matchCase ? "" : "i");
      delete this.regexpSource;
      this.__defineGetter__("regexp", function()
      {
        return regexp;
      });
      return this.regexp;
    },
    contentType: 2147483647,
    matchCase: false,
    thirdParty: null,
    matches: function(location, contentType, docDomain, thirdParty)
    {
      if (this.regexp.test(location) && (RegExpFilter.typeMap[contentType] & this.contentType) != 0 && (this.thirdParty == null || this.thirdParty == thirdParty) && this.isActiveOnDomain(docDomain))
      {
        return true;
      }
      return false;
    }
  };
  RegExpFilter.prototype.__defineGetter__("0", function()
  {
    return this;
  });
  RegExpFilter.fromText = function(text)
  {
    var blocking = true;
    var origText = text;
    if (text.indexOf("@@") == 0)
    {
      blocking = false;
      text = text.substr(2);
    }
    var contentType = null;
    var matchCase = null;
    var domains = null;
    var siteKeys = null;
    var thirdParty = null;
    var collapse = null;
    var options;
    var match = text.indexOf("$") >= 0 ? Filter.optionsRegExp.exec(text) : null;
    if (match)
    {
      options = match[1].toUpperCase().split(",");
      text = match.input.substr(0, match.index);
      for (var _loopIndex6 = 0; _loopIndex6 < options.length; ++_loopIndex6)
      {
        var option = options[_loopIndex6];
        var value = null;
        var separatorIndex = option.indexOf("=");
        if (separatorIndex >= 0)
        {
          value = option.substr(separatorIndex + 1);
          option = option.substr(0, separatorIndex);
        }
        option = option.replace(/-/, "_");
        if (option in RegExpFilter.typeMap)
        {
          if (contentType == null)
          {
            contentType = 0;
          }
          contentType |= RegExpFilter.typeMap[option];
        }
        else if (option[0] == "~" && option.substr(1) in RegExpFilter.typeMap)
        {
          if (contentType == null)
          {
            contentType = RegExpFilter.prototype.contentType;
          }
          contentType &= ~RegExpFilter.typeMap[option.substr(1)];
        }
        else if (option == "MATCH_CASE")
        {
          matchCase = true;
        }
        else if (option == "~MATCH_CASE")
        {
          matchCase = false;
        }
        else if (option == "DOMAIN" && typeof value != "undefined")
        {
          domains = value;
        }
        else if (option == "THIRD_PARTY")
        {
          thirdParty = true;
        }
        else if (option == "~THIRD_PARTY")
        {
          thirdParty = false;
        }
        else if (option == "COLLAPSE")
        {
          collapse = true;
        }
        else if (option == "~COLLAPSE")
        {
          collapse = false;
        }
        else if (option == "SITEKEY" && typeof value != "undefined")
        {
          siteKeys = value.split(/\|/);
        }
        else
        {
          return new InvalidFilter(origText, "Unknown option " + option.toLowerCase());
        }
      }
    }
    if (!blocking && (contentType == null || contentType & RegExpFilter.typeMap.DOCUMENT) && (!options || options.indexOf("DOCUMENT") < 0) && !/^\|?[\w\-]+:/.test(text))
    {
      if (contentType == null)
      {
        contentType = RegExpFilter.prototype.contentType;
      }
      contentType &= ~RegExpFilter.typeMap.DOCUMENT;
    }
    if (!blocking && siteKeys)
    {
      contentType = RegExpFilter.typeMap.DOCUMENT;
    }
    try
    {
      if (blocking)
      {
        return new BlockingFilter(origText, text, contentType, matchCase, domains, thirdParty, collapse);
      }
      else
      {
        return new WhitelistFilter(origText, text, contentType, matchCase, domains, thirdParty, siteKeys);
      }
    }
    catch (e)
    {
      return new InvalidFilter(origText, e);
    }
  };
  RegExpFilter.typeMap =
  {
    OTHER: 1,
    SCRIPT: 2,
    IMAGE: 4,
    STYLESHEET: 8,
    OBJECT: 16,
    SUBDOCUMENT: 32,
    DOCUMENT: 64,
    XBL: 1,
    PING: 1,
    XMLHTTPREQUEST: 2048,
    OBJECT_SUBREQUEST: 4096,
    DTD: 1,
    MEDIA: 16384,
    FONT: 32768,
    BACKGROUND: 4,
    POPUP: 268435456,
    ELEMHIDE: 1073741824
  };
  RegExpFilter.prototype.contentType &= ~ (RegExpFilter.typeMap.ELEMHIDE | RegExpFilter.typeMap.POPUP);

  function BlockingFilter(text, regexpSource, contentType, matchCase, domains, thirdParty, collapse)
  {
    RegExpFilter.call(this, text, regexpSource, contentType, matchCase, domains, thirdParty);
    this.collapse = collapse;
  }
  exports.BlockingFilter = BlockingFilter;
  BlockingFilter.prototype =
  {
    __proto__: RegExpFilter.prototype,
    collapse: null
  };

  function WhitelistFilter(text, regexpSource, contentType, matchCase, domains, thirdParty, siteKeys)
  {
    RegExpFilter.call(this, text, regexpSource, contentType, matchCase, domains, thirdParty);
    if (siteKeys != null)
    {
      this.siteKeys = siteKeys;
    }
  }
  exports.WhitelistFilter = WhitelistFilter;
  WhitelistFilter.prototype =
  {
    __proto__: RegExpFilter.prototype,
    siteKeys: null
  };

  function ElemHideBase(text, domains, selector)
  {
    ActiveFilter.call(this, text, domains ? domains.toUpperCase() : null);
    if (domains)
    {
      this.selectorDomain = domains.replace(/,~[^,]+/g, "").replace(/^~[^,]+,?/, "").toLowerCase();
    }
    this.selector = selector;
  }
  exports.ElemHideBase = ElemHideBase;
  ElemHideBase.prototype =
  {
    __proto__: ActiveFilter.prototype,
    domainSeparator: ",",
    ignoreTrailingDot: false,
    selectorDomain: null,
    selector: null
  };
  ElemHideBase.fromText = function(text, domain, isException, tagName, attrRules, selector)
  {
    if (!selector)
    {
      if (tagName == "*")
      {
        tagName = "";
      }
      var id = null;
      var additional = "";
      if (attrRules)
      {
        attrRules = attrRules.match(/\([\w\-]+(?:[$^*]?=[^\(\)"]*)?\)/g);
        for (var _loopIndex7 = 0; _loopIndex7 < attrRules.length; ++_loopIndex7)
        {
          var rule = attrRules[_loopIndex7];
          rule = rule.substr(1, rule.length - 2);
          var separatorPos = rule.indexOf("=");
          if (separatorPos > 0)
          {
            rule = rule.replace(/=/, "=\"") + "\"";
            additional += "[" + rule + "]";
          }
          else
          {
            if (id)
            {
              var Utils = require("utils").Utils;
              return new InvalidFilter(text, Utils.getString("filter_elemhide_duplicate_id"));
            }
            else
            {
              id = rule;
            }
          }
        }
      }
      if (id)
      {
        selector = tagName + "." + id + additional + "," + tagName + "#" + id + additional;
      }
      else if (tagName || additional)
      {
        selector = tagName + additional;
      }
      else
      {
        var Utils = require("utils").Utils;
        return new InvalidFilter(text, Utils.getString("filter_elemhide_nocriteria"));
      }
    }
    if (isException)
    {
      return new ElemHideException(text, domain, selector);
    }
    else
    {
      return new ElemHideFilter(text, domain, selector);
    }
  };

  function ElemHideFilter(text, domains, selector)
  {
    ElemHideBase.call(this, text, domains, selector);
  }
  exports.ElemHideFilter = ElemHideFilter;
  ElemHideFilter.prototype =
  {
    __proto__: ElemHideBase.prototype
  };

  function ElemHideException(text, domains, selector)
  {
    ElemHideBase.call(this, text, domains, selector);
  }
  exports.ElemHideException = ElemHideException;
  ElemHideException.prototype =
  {
    __proto__: ElemHideBase.prototype
  };
  return exports;
})();

require.scopes["elemHide"] = (function()
{
  var exports = {};
  var Utils = require("utils").Utils;
  var Prefs = require("prefs").Prefs;
  var ElemHideException = require("filterClasses").ElemHideException;
  var FilterNotifier = require("filterNotifier").FilterNotifier;
  var AboutHandler = require("elemHideHitRegistration").AboutHandler;
  var filterByKey =
  {
    __proto__: null
  };
  var keyByFilter =
  {
    __proto__: null
  };
  var knownExceptions =
  {
    __proto__: null
  };
  var exceptions =
  {
    __proto__: null
  };
  var styleURL = null;
  var ElemHide = exports.ElemHide =
  {
    isDirty: false,
    applied: false,
    init: function()
    {
      Prefs.addListener(function(name)
      {
        if (name == "enabled")
        {
          ElemHide.apply();
        }
      });
      onShutdown.add(function()
      {
        ElemHide.unapply();
      });
      var styleFile = IO.resolveFilePath(Prefs.data_directory);
      styleFile.append("elemhide.css");
      styleURL = Services.io.newFileURI(styleFile).QueryInterface(Ci.nsIFileURL);
    },
    clear: function()
    {
      filterByKey =
      {
        __proto__: null
      };
      keyByFilter =
      {
        __proto__: null
      };
      knownExceptions =
      {
        __proto__: null
      };
      exceptions =
      {
        __proto__: null
      };
      ElemHide.isDirty = false;
      ElemHide.unapply();
    },
    add: function(filter)
    {
      if (filter instanceof ElemHideException)
      {
        if (filter.text in knownExceptions)
        {
          return;
        }
        var selector = filter.selector;
        if (!(selector in exceptions))
        {
          exceptions[selector] = [];
        }
        exceptions[selector].push(filter);
        knownExceptions[filter.text] = true;
      }
      else
      {
        if (filter.text in keyByFilter)
        {
          return;
        }
        var key;
        do
        {
          key = Math.random().toFixed(15).substr(5);
        }
        while (key in filterByKey);
        filterByKey[key] = filter;
        keyByFilter[filter.text] = key;
        ElemHide.isDirty = true;
      }
    },
    remove: function(filter)
    {
      if (filter instanceof ElemHideException)
      {
        if (!(filter.text in knownExceptions))
        {
          return;
        }
        var list = exceptions[filter.selector];
        var index = list.indexOf(filter);
        if (index >= 0)
        {
          list.splice(index, 1);
        }
        delete knownExceptions[filter.text];
      }
      else
      {
        if (!(filter.text in keyByFilter))
        {
          return;
        }
        var key = keyByFilter[filter.text];
        delete filterByKey[key];
        delete keyByFilter[filter.text];
        ElemHide.isDirty = true;
      }
    },
    getException: function(filter, docDomain)
    {
      var selector = filter.selector;
      if (!(filter.selector in exceptions))
      {
        return null;
      }
      var list = exceptions[filter.selector];
      for (var i = list.length - 1; i >= 0; i--)
      {
        if (list[i].isActiveOnDomain(docDomain))
        {
          return list[i];
        }
      }
      return null;
    },
    _applying: false,
    _needsApply: false,
    apply: function()
    {
      if (this._applying)
      {
        this._needsApply = true;
        return;
      }
      if (!ElemHide.isDirty || !Prefs.enabled)
      {
        if (Prefs.enabled && !ElemHide.applied)
        {
          try
          {
            Utils.styleService.loadAndRegisterSheet(styleURL, Ci.nsIStyleSheetService.USER_SHEET);
            ElemHide.applied = true;
          }
          catch (e)
          {
            Cu.reportError(e);
          }
        }
        else if (!Prefs.enabled && ElemHide.applied)
        {
          ElemHide.unapply();
        }
        return;
      }
      IO.writeToFile(styleURL.file, false, this._generateCSSContent(), function(e)
      {
        this._applying = false;
        if (e && e.result == Cr.NS_ERROR_NOT_AVAILABLE)
        {
          IO.removeFile(styleURL.file, function(e2){});
        }
        else if (e)
        {
          Cu.reportError(e);
        }
        if (this._needsApply)
        {
          this._needsApply = false;
          this.apply();
        }
        else if (!e || e.result == Cr.NS_ERROR_NOT_AVAILABLE)
        {
          ElemHide.isDirty = false;
          ElemHide.unapply();
          if (!e)
          {
            try
            {
              Utils.styleService.loadAndRegisterSheet(styleURL, Ci.nsIStyleSheetService.USER_SHEET);
              ElemHide.applied = true;
            }
            catch (e)
            {
              Cu.reportError(e);
            }
          }
          FilterNotifier.triggerListeners("elemhideupdate");
        }
      }.bind(this), "ElemHideWrite");
      this._applying = true;
    },
    _generateCSSContent: function()
    {
      var _generatorResult16 = [];
      var domains =
      {
        __proto__: null
      };
      var hasFilters = false;
      for (var key in filterByKey)
      {
        var filter = filterByKey[key];
        var domain = filter.selectorDomain || "";
        var list;
        if (domain in domains)
        {
          list = domains[domain];
        }
        else
        {
          list =
          {
            __proto__: null
          };
          domains[domain] = list;
        }
        list[filter.selector] = key;
        hasFilters = true;
      }
      if (!hasFilters)
      {
        throw Cr.NS_ERROR_NOT_AVAILABLE;
      }

      function escapeChar(match)
      {
        return "\\" + match.charCodeAt(0).toString(16) + " ";
      }
      var cssTemplate = "-moz-binding: url(about:" + AboutHandler.aboutPrefix + "?%ID%#dummy) !important;";
      for (var domain in domains)
      {
        var rules = [];
        var list = domains[domain];
        if (domain)
        {
          _generatorResult16.push(("@-moz-document domain(\"" + domain.split(",").join("\"),domain(\"") + "\"){").replace(/[^\x01-\x7F]/g, escapeChar));
        }
        else
        {
          _generatorResult16.push("@-moz-document url-prefix(\"http://\"),url-prefix(\"https://\")," + "url-prefix(\"mailbox://\"),url-prefix(\"imap://\")," + "url-prefix(\"news://\"),url-prefix(\"snews://\"){");
        }
        for (var selector in list)
        {
          _generatorResult16.push(selector.replace(/[^\x01-\x7F]/g, escapeChar) + "{" + cssTemplate.replace("%ID%", list[selector]) + "}");
        }
        _generatorResult16.push("}");
      }
      return _generatorResult16;
    },
    unapply: function()
    {
      if (ElemHide.applied)
      {
        try
        {
          Utils.styleService.unregisterSheet(styleURL, Ci.nsIStyleSheetService.USER_SHEET);
        }
        catch (e)
        {
          Cu.reportError(e);
        }
        ElemHide.applied = false;
      }
    },
    get styleURL()
    {
      return ElemHide.applied ? styleURL.spec : null;
    },
    getFilterByKey: function(key)
    {
      return key in filterByKey ? filterByKey[key] : null;
    },
    getSelectorsForDomain: function(domain, specificOnly)
    {
      var result = [];
      for (var key in filterByKey)
      {
        var filter = filterByKey[key];
        if (specificOnly && (!filter.domains || filter.domains[""]))
        {
          continue;
        }
        if (filter.isActiveOnDomain(domain) && !this.getException(filter, domain))
        {
          result.push(filter.selector);
        }
      }
      return result;
    }
  };
  return exports;
})();