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
import { Globe, MessageSquare, Mic2, Headphones, Copy, Check } from "lucide-react";
import { CopyButton } from "@/components/widget/copy-button";
import { WidgetPreview } from "@/components/widget/widget-preview";
import { EmailInstructionsButton } from "@/components/widget/email-instructions-button";

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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.aussieaiagency.com.au";

  const iframeCode = agentId
    ? `<!-- Aussie AI Agency Voice Widget -->\n<script>\n(function(){\n  var d=document,s=d.createElement('script');\n  s.src='${baseUrl}/widget-loader.js';\n  s.setAttribute('data-agent-id','${agentId}');\n  s.setAttribute('data-base-url','${baseUrl}');\n  s.async=true;\n  d.body.appendChild(s);\n})();\n</script>`
    : null;

  const chatCode = agentId
    ? `<!-- Aussie AI Agency Chat Widget (Text) -->\n<script>\n(function(){\n  var d=document,s=d.createElement('script');\n  s.src='${baseUrl}/chat-widget-loader.js';\n  s.setAttribute('data-agent-id','${agentId}');\n  s.setAttribute('data-base-url','${baseUrl}');\n  s.async=true;\n  d.body.appendChild(s);\n})();\n</script>`
    : null;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-500 font-heading">
          Add Your AI Receptionist to Your Website
        </h1>
        <p className="text-muted-foreground mt-1">
          Let website visitors talk to your AI receptionist instantly &mdash; just copy and paste one piece of code.
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
          {/* Visual preview mockup */}
          <WidgetPreview agentName={agent.name ?? "AI Receptionist"} />

          {/* How it works - simple steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How to Install (3 Simple Steps)</CardTitle>
              <CardDescription>
                No coding skills needed. If you can copy and paste, you can do this.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-3">
                {/* Step 1 */}
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-[#F5A623] text-[#0A1628] flex items-center justify-center font-bold text-sm flex-shrink-0">
                      1
                    </div>
                    <h3 className="font-semibold text-sm text-[#0A1628]">Copy the code below</h3>
                  </div>
                  <div className="ml-12">
                    <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center">
                      <div className="w-10 h-10 rounded-lg bg-[#0A1628] mx-auto mb-2 flex items-center justify-center">
                        <Copy className="h-5 w-5 text-[#F5A623]" />
                      </div>
                      <p className="text-xs text-muted-foreground">Click the &quot;Copy&quot; button on the code box</p>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-[#F5A623] text-[#0A1628] flex items-center justify-center font-bold text-sm flex-shrink-0">
                      2
                    </div>
                    <h3 className="font-semibold text-sm text-[#0A1628]">Paste it on your website</h3>
                  </div>
                  <div className="ml-12">
                    <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center">
                      <div className="w-10 h-10 rounded-lg bg-white border mx-auto mb-2 flex items-center justify-center text-xs font-mono text-gray-400">
                        &lt;/&gt;
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Paste before the <code className="bg-gray-200 px-1 rounded text-[10px]">&lt;/body&gt;</code> tag
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-[#F5A623] text-[#0A1628] flex items-center justify-center font-bold text-sm flex-shrink-0">
                      3
                    </div>
                    <h3 className="font-semibold text-sm text-[#0A1628]">That&apos;s it!</h3>
                  </div>
                  <div className="ml-12">
                    <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center">
                      <div className="w-10 h-10 rounded-full bg-green-100 mx-auto mb-2 flex items-center justify-center">
                        <Check className="h-5 w-5 text-green-600" />
                      </div>
                      <p className="text-xs text-muted-foreground">The widget appears automatically in the bottom-right corner</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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
                    Works on WordPress, Wix, Squarespace, Shopify, and more
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Voice Widget Embed code */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Mic2 className="h-5 w-5 text-[#F5A623]" />
                    Voice Widget Code
                  </CardTitle>
                  <CardDescription>
                    Voice + text chat widget for your website.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    {agent.name}
                  </Badge>
                </div>
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

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <EmailInstructionsButton code={iframeCode!} widgetType="Voice" />
              </div>
            </CardContent>
          </Card>

          {/* Chat Widget Embed Code */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="h-5 w-5 text-[#F5A623]" />
                    Chat Widget Code
                  </CardTitle>
                  <CardDescription>
                    Text-only chatbot &mdash; same AI personality, just text chat for website visitors.
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

              <div className="flex flex-wrap gap-3">
                <EmailInstructionsButton code={chatCode!} widgetType="Chat" />
              </div>
            </CardContent>
          </Card>

          {/* Live Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Live Preview</CardTitle>
              <CardDescription>
                This is how the widget will look and work on your website.
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

          {/* Need help */}
          <div className="rounded-xl border border-[#F5A623]/20 bg-gradient-to-r from-[#F5A623]/[0.06] to-transparent p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-[#F5A623]/15 flex items-center justify-center flex-shrink-0">
                <Headphones className="h-5 w-5 text-[#F5A623]" />
              </div>
              <div>
                <p className="font-semibold text-sm text-[#0A1628]">
                  Need help installing?
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Book a free 15-minute setup call and our team will add the widget to your website for you.
                </p>
              </div>
            </div>
            <a
              href="https://calendly.com/aussieaiagency/setup"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-[#F5A623] px-5 py-2.5 text-sm font-semibold text-[#0A1628] hover:bg-[#d48d0f] transition-colors"
            >
              Book Free Setup Call
            </a>
          </div>
        </>
      )}
    </div>
  );
}
