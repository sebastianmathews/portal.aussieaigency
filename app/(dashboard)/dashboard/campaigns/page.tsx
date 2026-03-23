import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Rocket } from "lucide-react";

export default function CampaignsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-500">Campaigns</h1>
        <p className="text-muted-foreground mt-1">
          Outbound calling campaigns to reach your contacts
        </p>
      </div>

      <Card>
        <CardContent className="py-20 text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-gold-50 flex items-center justify-center mb-6">
            <Megaphone className="h-10 w-10 text-gold-500" />
          </div>

          <Badge className="mb-4 bg-gold-500/15 text-gold-600 hover:bg-gold-500/15 border-gold-200">
            <Rocket className="h-3 w-3 mr-1" />
            Coming Soon
          </Badge>

          <h2 className="text-2xl font-bold text-navy-500 mb-3">
            Outbound Campaigns
          </h2>

          <p className="text-muted-foreground max-w-lg mx-auto mb-2">
            Launch outbound calling campaigns to reach your contacts
            automatically. Schedule follow-ups, appointment reminders, and
            promotional calls powered by your AI agent.
          </p>

          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            We are working hard to bring you this feature. Stay tuned for
            updates!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
