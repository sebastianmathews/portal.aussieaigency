"use client";

import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmailInstructionsButtonProps {
  code: string;
  widgetType: string;
}

export function EmailInstructionsButton({
  code,
  widgetType,
}: EmailInstructionsButtonProps) {
  const handleClick = () => {
    const subject = encodeURIComponent(
      `Please add the Aussie AI Agency ${widgetType} Widget to our website`
    );

    const body = encodeURIComponent(
      `Hi,

I'd like you to add our AI chat widget to the website. It's a simple copy-and-paste job that should only take a minute.

Here's what to do:

1. Copy the code below
2. Paste it just before the closing </body> tag on every page (or in the site-wide footer/template)
3. Save and publish — the widget will appear automatically in the bottom-right corner

Here's the code:

${code}

That's it! Let me know once it's done.

Thanks!`
    );

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 text-sm"
      onClick={handleClick}
    >
      <Mail className="h-4 w-4" />
      Email setup instructions to your web developer
    </Button>
  );
}
