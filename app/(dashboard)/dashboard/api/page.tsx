import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code2, Key, Terminal } from "lucide-react";
import { CopyButton } from "@/components/widget/copy-button";

export default async function APIDocsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const orgId = profile?.organization_id || "YOUR_API_KEY";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.aussieaiagency.com.au";

  const endpoints = [
    {
      method: "GET",
      path: "/api/v1/calls",
      description: "List all calls for your organization",
      params: "?limit=50&offset=0&status=completed",
      response: `{
  "data": [
    {
      "id": "uuid",
      "caller_number": "+61412345678",
      "status": "completed",
      "duration": 145,
      "lead_score": 8,
      "sentiment": "positive",
      "ai_summary": "Caller enquired about...",
      "recording_url": "https://...",
      "created_at": "2026-03-24T..."
    }
  ],
  "pagination": { "total": 42, "limit": 50, "offset": 0 }
}`,
    },
    {
      method: "GET",
      path: "/api/v1/agents",
      description: "List all AI agents",
      params: "",
      response: `{
  "data": [
    {
      "id": "uuid",
      "name": "Amy",
      "is_active": true,
      "voice_id": "...",
      "language": "en",
      "created_at": "2026-03-24T..."
    }
  ]
}`,
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[#0A1628] font-heading">API Documentation</h1>
        <p className="text-muted-foreground mt-1">
          Integrate Aussie AI Agency with your own systems
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="h-5 w-5 text-[#F5A623]" />
            Your API Key
          </CardTitle>
          <CardDescription>
            Use this key in the Authorization header for all API requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="bg-[#0A1628] text-[#F5A623] p-4 rounded-lg text-sm font-mono">
              {orgId}
            </pre>
            <div className="absolute top-2 right-2">
              <CopyButton text={orgId} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Available on Enterprise plan. Keep this key secret — it provides full access to your data.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Terminal className="h-5 w-5 text-[#F5A623]" />
            Authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-[#0A1628] text-green-400 p-4 rounded-lg text-sm font-mono overflow-x-auto">
{`curl -H "Authorization: Bearer ${orgId}" \\
  ${baseUrl}/api/v1/calls`}
          </pre>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#0A1628] font-heading flex items-center gap-2">
          <Code2 className="h-5 w-5 text-[#F5A623]" />
          Endpoints
        </h2>

        {endpoints.map((ep) => (
          <Card key={ep.path}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 font-mono text-xs">
                  {ep.method}
                </Badge>
                <code className="text-sm font-mono text-[#0A1628]">{ep.path}</code>
              </div>
              <CardDescription>{ep.description}</CardDescription>
              {ep.params && (
                <p className="text-xs font-mono text-muted-foreground mt-1">
                  Parameters: {ep.params}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Response</p>
              <pre className="bg-[#0A1628] text-green-400 p-4 rounded-lg text-xs font-mono overflow-x-auto">
                {ep.response}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">
            <strong>Rate Limits:</strong> 60 requests per minute per API key.
            Contact support for higher limits on Enterprise plans.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
