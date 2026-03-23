(function () {
  var script = document.currentScript;
  var agentId = script.getAttribute("data-agent-id");
  var baseUrl = script.getAttribute("data-base-url") || "https://portal.aussieaigency.com.au";

  if (!agentId) {
    console.error("Aussie AI Agency Chat Widget: Missing data-agent-id attribute");
    return;
  }

  var iframe = document.createElement("iframe");
  iframe.src = baseUrl + "/chat-widget/" + agentId;
  iframe.style.cssText =
    "position:fixed;bottom:0;right:0;width:min(420px,100vw);height:min(600px,100vh);border:none;z-index:99999;background:transparent;pointer-events:auto;";
  iframe.setAttribute("allow", "microphone");
  iframe.setAttribute("title", "AI Chat Widget");

  document.body.appendChild(iframe);
})();
