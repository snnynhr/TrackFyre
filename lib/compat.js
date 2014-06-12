function require(module)
{
  return require.scopes[module];
}
require.scopes = {__proto__: null};

function importAll(module, globalObj)
{
  var exports = require(module);
  for (var key in exports)
    globalObj[key] = exports[key];
}