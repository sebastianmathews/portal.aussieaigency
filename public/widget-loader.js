(function () {
  var script = document.currentScript;
  var agentId = script.getAttribute("data-agent-id");
  var baseUrl = script.getAttribute("data-base-url") || "https://portal.aussieaigency.com.au";

  if (!agentId) {
    console.error("Aussie AI Agency Widget: Missing data-agent-id attribute");
    return;
  }

  var iframe = document.createElement("iframe");
  iframe.src = baseUrl + "/widget/" + agentId;
  iframe.style.cssText =
    "position:fixed;bottom:0;right:0;width:420px;height:620px;border:none;z-index:99999;background:transparent;pointer-events:none;";
  iframe.setAttribute("allow", "microphone");
  iframe.setAttribute("title", "AI Chat Widget");

  // Allow clicks to pass through to the widget
  iframe.addEventListener("load", function () {
    iframe.style.pointerEvents = "auto";
  });

  document.body.appendChild(iframe);
})();
