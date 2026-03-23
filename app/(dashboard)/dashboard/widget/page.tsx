import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, MessageSquare, Mic2 } from "lucide-react";
import { CopyButton } from "@/components/widget/copy-button";

export default async function WidgetPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const orgId = profile?.organization_id;
  if (!orgId) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-muted-foreground">No organization found.</p>
      </div>
    );
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("elevenlabs_agent_id, name")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const agentId = agent?.elevenlabs_agent_id;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://portal.aussieaigency.com.au";

  const iframeCode = agentId
    ? `<!-- Aussie AI Agency Chat Widget -->
<script>
(function(){
  var d=document,s=d.createElement('script');
  s.src='${baseUrl}/widget-loader.js';
  s.setAttribute('data-agent-id','${agentId}');
  s.setAttribute('data-base-url','${baseUrl}');
  s.async=true;
  d.body.appendChild(s);
})();
</script>`
    : null;

  const chatCode = agentId
    ? `<!-- Aussie AI Agency Chat Widget (Text) -->
<script>
(function(){
  var d=document,s=d.createElement('script');
  s.src='${baseUrl}/chat-widget-loader.js';
  s.setAttribute('data-agent-id','${agentId}');
  s.setAttribute('data-base-url','${baseUrl}');
  s.async=true;
  d.body.appendChild(s);
})();
</script>`
    : null;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-500 font-heading">
          Website Widget
        </h1>
        <p className="text-muted-foreground mt-1">
          Add an AI chat widget to your website so visitors can talk to your bot
        </p>
      </div>

      {!agentId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="font-medium text-navy-500 mb-1">
              Create an AI agent first
            </p>
            <p className="text-sm text-muted-foreground">
              You need to set up your AI agent before you can embed it on your
              website.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Features */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-5 flex items-start gap-3">
                <div className="rounded-lg bg-[#F5A623]/10 p-2.5">
                  <MessageSquare className="h-5 w-5 text-[#F5A623]" />
                </div>
                <div>
                  <p className="font-medium text-sm">Text Chat</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Visitors can type messages
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-start gap-3">
                <div className="rounded-lg bg-[#F5A623]/10 p-2.5">
                  <Mic2 className="h-5 w-5 text-[#F5A623]" />
                </div>
                <div>
                  <p className="font-medium text-sm">Voice Calls</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    WebRTC voice conversation
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-start gap-3">
                <div className="rounded-lg bg-[#F5A623]/10 p-2.5">
                  <Globe className="h-5 w-5 text-[#F5A623]" />
                </div>
                <div>
                  <p className="font-medium text-sm">Any Website</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    One script tag to embed
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Embed code */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Mic2 className="h-5 w-5 text-[#F5A623]" />
                    Voice Widget (Essential + Complete)
                  </CardTitle>
                  <CardDescription>
                    Voice + text chat widget. Copy and paste before the closing{" "}
                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                      &lt;/body&gt;
                    </code>{" "}
                    tag on your website.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  {agent.name}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <pre className="bg-[#0A1628] text-green-400 p-4 rounded-lg text-sm overflow-x-auto font-mono leading-relaxed">
                  {iframeCode}
                </pre>
                <div className="absolute top-3 right-3">
                  <CopyButton text={iframeCode!} />
                </div>
              </div>

              <div className="rounded-lg border bg-[#F5A623]/5 border-[#F5A623]/20 p-4">
                <h4 className="font-medium text-sm text-navy-500 mb-2">
                  Installation Steps
                </h4>
                <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                  <li>Copy the embed code above</li>
                  <li>
                    Open your website&apos;s HTML or CMS editor
                  </li>
                  <li>
                    Paste the code just before the closing{" "}
                    <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                      &lt;/body&gt;
                    </code>{" "}
                    tag
                  </li>
                  <li>Save and publish — the chat widget will appear automatically</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Chat Widget Embed Code (Complete plan) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="h-5 w-5 text-[#F5A623]" />
                    Chat Widget (Complete plan)
                  </CardTitle>
                  <CardDescription>
                    Text-only chatbot powered by OpenAI. Same AI personality, no
                    voice — just text chat for website visitors.
                  </CardDescription>
                </div>
                <Badge className="bg-[#F5A623]/15 text-[#F5A623] hover:bg-[#F5A623]/15 text-xs">
                  Complete plan
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <pre className="bg-[#0A1628] text-green-400 p-4 rounded-lg text-sm overflow-x-auto font-mono leading-relaxed">
                  {chatCode}
                </pre>
                <div className="absolute top-3 right-3">
                  <CopyButton text={chatCode!} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preview</CardTitle>
              <CardDescription>
                This is how the widget will look on your website.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative bg-gray-50 rounded-lg border h-[400px] overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                  <p>Your website content</p>
                </div>
                <iframe
                  src={`/widget/${agentId}`}
                  className="absolute inset-0 w-full h-full border-0"
                  title="Widget Preview"
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
