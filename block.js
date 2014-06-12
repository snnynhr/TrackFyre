function restore_options() {
 document.getElementById('email_box').value = localStorage.getItem("storedEmail");
 document.getElementById('interval_box').value = localStorage.getItem("storedInterval");
}
function init()
{

  $("#addButton").click(execPost);
  $("#cancelButton").click(closeDialog.bind(null, false));

  // Apply jQuery UI styles
  $("button").button();
  
  ext.backgroundPage.sendMessage(
  {
    type: "forward",
    payload:
    {
      type: "clickhide-init",
      width: Math.max(document.body.offsetWidth || document.body.scrollWidth),
      height: Math.max(document.body.offsetHeight || document.body.scrollHeight)
    }
  },
  function(response)
  {
    document.getElementById("filters").value = response.filters.join("\n");
    //chrome.extension.getBackgroundPage().console.log('foo');
  });
  
  restore_options();
  document.getElementById("filters").focus();
}
window.addEventListener("load", init, false);

function execPost()
{
    //event.preventDefault();
    localStorage.setItem("storedEmail",document.getElementById("email_box").value);
    localStorage.setItem("storedInterval",document.getElementById("interval_box").value);

    var em = localStorage.getItem("storedEmail");
    var ur = localStorage.getItem("storedUrl");
    console.log(em);
    console.log(ur);
    
    $.post("http://trackfyre.com/new.php",
    {
       html: document.getElementById("filters").value,
       tags: "",
       url: ur,
       email: em
    },function(args)
    {
      console.log("Success.");
      $("#cancelButton").click();
    });
}

function closeDialog(success)
{
  ext.backgroundPage.sendMessage(
    {
      type: "forward",
      payload:
      {
        type: "clickhide-close",
        remove: (typeof success == "boolean" ? success : false)
      }
    }
  );
}
