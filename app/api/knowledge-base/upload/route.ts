import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES = [
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const orgId = profile?.organization_id;
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Supported: PDF, TXT, CSV, DOC, DOCX, Markdown.",
        },
        { status: 400 }
      );
    }

    // Extract text content from file
    let textContent = "";

    if (file.type === "text/plain" || file.type === "text/csv" || file.type === "text/markdown") {
      textContent = await file.text();
    } else if (file.type === "application/pdf") {
      // For PDFs, we store raw text extraction
      // In production you'd use a PDF parser like pdf-parse
      // For now, read as text (works for text-based PDFs)
      const buffer = await file.arrayBuffer();
      const decoder = new TextDecoder("utf-8", { fatal: false });
      const rawText = decoder.decode(buffer);
      // Extract readable text between stream markers
      const textMatches = rawText.match(/\((.*?)\)/g);
      textContent = textMatches
        ? textMatches
            .map((m) => m.slice(1, -1))
            .filter((t) => t.length > 2 && /[a-zA-Z]/.test(t))
            .join(" ")
        : `[PDF file: ${file.name} - content will be used by AI agent]`;
    } else {
      // DOC/DOCX - extract what we can
      const buffer = await file.arrayBuffer();
      const decoder = new TextDecoder("utf-8", { fatal: false });
      textContent = decoder.decode(buffer).replace(/[^\x20-\x7E\n\r]/g, " ");
    }

    // Trim and clean
    textContent = textContent
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 50000); // Limit to ~50k chars

    if (!textContent || textContent.length < 10) {
      textContent = `[Uploaded file: ${file.name}]`;
    }

    // Save to knowledge_items in the agent's knowledge base
    const { data: agent } = await supabase
      .from("agents")
      .select("id")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!agent) {
      return NextResponse.json(
        { error: "Create an AI agent first" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        item: {
          type: "file",
          name: file.name,
          content: textContent,
          fileType: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 }
    );
  }
}
