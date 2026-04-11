const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    throw new Error("Missing ELEVENLABS_API_KEY environment variable");
  }
  return key;
}

function headers(): HeadersInit {
  return {
    "xi-api-key": getApiKey(),
    "Content-Type": "application/json",
  };
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${ELEVENLABS_API_BASE}${path}`, {
    ...options,
    headers: { ...headers(), ...options.headers },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `ElevenLabs API error ${res.status}: ${body}`
    );
  }

  // DELETE responses may have no body
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return {} as T;
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FAQ {
  question: string;
  answer: string;
}

export interface VoiceSettings {
  stability?: number;
  similarityBoost?: number;
  style?: number;
  speed?: number;
  useSpeakerBoost?: boolean;
  expressiveMode?: boolean;
  audioTags?: string[];
}

export interface AgentConfig {
  name: string;
  voiceId: string;
  greeting: string;
  systemPrompt: string;
  webhookUrl?: string;
  language?: string;
  maxCallDuration?: number;
  callRecording?: boolean;
  escalationNumber?: string;
  faqs?: FAQ[];
  voiceSettings?: VoiceSettings;
  interruptible?: boolean;
  timezone?: string;
  afterHoursGreeting?: string;
  afterHoursBehaviour?: string;
  afterHoursTransferNumber?: string;
}

export interface Agent {
  agent_id: string;
  name: string;
  [key: string]: unknown;
}

export interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  preview_url: string;
}

export interface Conversation {
  conversation_id: string;
  agent_id: string;
  status: string;
  transcript: Array<{
    role: string;
    message: string;
    timestamp: number;
  }>;
  metadata: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ConversationSummary {
  conversation_id: string;
  agent_id: string;
  status: string;
  start_time: string;
  end_time?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Agent CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new conversational AI agent.
 */
/**
 * Build TTS voice settings payload for ElevenLabs API.
 */
function buildTtsConfig(voiceId: string, settings?: VoiceSettings) {
  const tts: Record<string, unknown> = {
    voice_id: voiceId,
  };

  if (settings) {
    tts.voice_settings = {
      stability: settings.stability ?? 0.5,
      similarity_boost: settings.similarityBoost ?? 0.75,
      style: settings.style ?? 0,
      speed: settings.speed ?? 1.0,
      use_speaker_boost: settings.useSpeakerBoost ?? true,
    };

    // Audio tags for v3 models (up to 20)
    if (settings.audioTags && settings.audioTags.length > 0) {
      tts.suggested_audio_tags = settings.audioTags.map((tag) => ({
        tag,
      }));
    }
  }

  return tts;
}

/**
 * Build the system prompt with FAQs appended as knowledge.
 */
function buildPromptWithFaqs(systemPrompt: string, faqs?: FAQ[]): string {
  if (!faqs || faqs.length === 0) return systemPrompt;

  const faqBlock = faqs
    .map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`)
    .join("\n\n");

  return `${systemPrompt}\n\n---\nFrequently Asked Questions:\n\n${faqBlock}`;
}

/**
 * Create a new conversational AI agent.
 */
export async function createAgent(config: AgentConfig): Promise<Agent> {
  let basePrompt = config.systemPrompt;
  if (config.timezone) {
    basePrompt += `\n\nTimezone: ${config.timezone}. Use this timezone for all date/time references.`;
  }
  if (config.afterHoursGreeting) {
    const behaviour = config.afterHoursBehaviour ?? "message";
    basePrompt += `\n\nAfter-Hours Instructions: Outside of business hours, use this greeting: "${config.afterHoursGreeting}". After-hours behaviour: ${behaviour}.`;
    if (behaviour === "transfer" && config.afterHoursTransferNumber) {
      basePrompt += ` Transfer after-hours calls to: ${config.afterHoursTransferNumber}.`;
    }
  }
  const fullPrompt = buildPromptWithFaqs(basePrompt, config.faqs);

  return apiRequest<Agent>("/convai/agents/create", {
    method: "POST",
    body: JSON.stringify({
      name: config.name,
      conversation_config: {
        agent: {
          prompt: {
            prompt: fullPrompt,
            llm: "gpt-4o-mini",
          },
          first_message: config.greeting,
          language: config.language ?? "en",
          ...(config.maxCallDuration && {
            max_duration_seconds: config.maxCallDuration,
          }),
        },
        turn: {
          mode: config.interruptible === false ? "turn" : "silence",
        },
        tts: buildTtsConfig(config.voiceId, config.voiceSettings),
        ...(config.callRecording && {
          conversation: {
            recording: { enabled: true },
          },
        }),
      },
      platform_settings: {
        ...(config.webhookUrl && {
          webhook: {
            url: config.webhookUrl,
          },
        }),
        ...(config.escalationNumber && {
          call_transfer: {
            phone_number: config.escalationNumber,
          },
        }),
      },
    }),
  });
}

/**
 * Update an existing agent's configuration.
 */
export async function updateAgent(
  agentId: string,
  config: Partial<AgentConfig>
): Promise<Agent> {
  const body: Record<string, unknown> = {};

  if (config.name) {
    body.name = config.name;
  }

  const conversationConfig: Record<string, unknown> = {};
  const agentSection: Record<string, unknown> = {};

  if (config.systemPrompt) {
    let basePrompt = config.systemPrompt;
    if (config.timezone) {
      basePrompt += `\n\nTimezone: ${config.timezone}. Use this timezone for all date/time references.`;
    }
    if (config.afterHoursGreeting) {
      const behaviour = config.afterHoursBehaviour ?? "message";
      basePrompt += `\n\nAfter-Hours Instructions: Outside of business hours, use this greeting: "${config.afterHoursGreeting}". After-hours behaviour: ${behaviour}.`;
      if (behaviour === "transfer" && config.afterHoursTransferNumber) {
        basePrompt += ` Transfer after-hours calls to: ${config.afterHoursTransferNumber}.`;
      }
    }
    const fullPrompt = buildPromptWithFaqs(basePrompt, config.faqs);
    agentSection.prompt = { prompt: fullPrompt, llm: "gpt-4o-mini" };
  } else if (config.faqs && config.faqs.length > 0) {
    // FAQs changed but system prompt didn't — we still need to rebuild
    // This case is handled by always sending systemPrompt from the form
  }
  if (config.greeting) {
    agentSection.first_message = config.greeting;
  }
  if (config.language) {
    agentSection.language = config.language;
  }
  if (config.maxCallDuration) {
    agentSection.max_duration_seconds = config.maxCallDuration;
  }
  if (Object.keys(agentSection).length > 0) {
    conversationConfig.agent = agentSection;
  }
  if (config.interruptible !== undefined) {
    conversationConfig.turn = {
      mode: config.interruptible === false ? "turn" : "silence",
    };
  }
  if (config.voiceId || config.voiceSettings) {
    conversationConfig.tts = buildTtsConfig(
      config.voiceId ?? "",
      config.voiceSettings
    );
  }
  if (config.callRecording !== undefined) {
    conversationConfig.conversation = {
      recording: { enabled: config.callRecording },
    };
  }
  if (Object.keys(conversationConfig).length > 0) {
    body.conversation_config = conversationConfig;
  }

  const platformSettings: Record<string, unknown> = {};
  if (config.webhookUrl) {
    platformSettings.webhook = { url: config.webhookUrl };
  }
  if (config.escalationNumber !== undefined) {
    if (config.escalationNumber) {
      platformSettings.call_transfer = {
        phone_number: config.escalationNumber,
      };
    } else {
      // Clear call transfer when escalation number is removed
      platformSettings.call_transfer = null;
    }
  }
  if (Object.keys(platformSettings).length > 0) {
    body.platform_settings = platformSettings;
  }

  return apiRequest<Agent>(`/convai/agents/${agentId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/**
 * Delete an agent by ID.
 */
export async function deleteAgent(agentId: string): Promise<void> {
  await apiRequest(`/convai/agents/${agentId}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Knowledge Base
// ---------------------------------------------------------------------------

export interface KBDocument {
  id: string;
  name: string;
  [key: string]: unknown;
}

/**
 * Upload a text document to ElevenLabs Knowledge Base.
 */
export async function addKBDocumentText(
  name: string,
  content: string
): Promise<KBDocument> {
  const formData = new FormData();
  const blob = new Blob([content], { type: "text/plain" });
  formData.append("file", blob, `${name}.txt`);
  formData.append("name", name);

  const res = await fetch(`${ELEVENLABS_API_BASE}/convai/knowledge-base`, {
    method: "POST",
    headers: { "xi-api-key": getApiKey() },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs KB upload error ${res.status}: ${body}`);
  }

  return res.json() as Promise<KBDocument>;
}

/**
 * Add a URL to ElevenLabs Knowledge Base.
 */
export async function addKBDocumentUrl(
  name: string,
  url: string
): Promise<KBDocument> {
  const formData = new FormData();
  formData.append("url", url);
  formData.append("name", name);

  const res = await fetch(`${ELEVENLABS_API_BASE}/convai/knowledge-base`, {
    method: "POST",
    headers: { "xi-api-key": getApiKey() },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs KB URL error ${res.status}: ${body}`);
  }

  return res.json() as Promise<KBDocument>;
}

/**
 * Link knowledge base documents to an agent.
 * Fetches existing KB docs first and merges to avoid overwriting.
 */
export async function linkKBToAgent(
  agentId: string,
  newDocumentIds: string[]
): Promise<void> {
  // Fetch current agent to get existing KB documents
  let existingIds: string[] = [];
  try {
    const agent = await apiRequest<{
      conversation_config?: {
        agent?: {
          prompt?: {
            knowledge_base?: Array<{ id: string; type: string }>;
          };
        };
      };
    }>(`/convai/agents/${agentId}`, { method: "GET" });

    existingIds = (
      agent.conversation_config?.agent?.prompt?.knowledge_base ?? []
    ).map((kb) => kb.id);
  } catch {
    // If fetch fails, proceed with just the new IDs
  }

  // Merge: existing + new, deduplicated
  const allIds = Array.from(new Set([...existingIds, ...newDocumentIds]));

  await apiRequest(`/convai/agents/${agentId}`, {
    method: "PATCH",
    body: JSON.stringify({
      conversation_config: {
        agent: {
          prompt: {
            knowledge_base: allIds.map((id) => ({
              type: "file",
              id,
            })),
          },
        },
      },
    }),
  });
}

/**
 * Delete a knowledge base document.
 */
export async function deleteKBDocument(documentId: string): Promise<void> {
  await apiRequest(`/convai/knowledge-base/${documentId}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Phone Numbers (Twilio via ElevenLabs)
// ---------------------------------------------------------------------------

/**
 * Register a Twilio phone number with ElevenLabs so they handle call routing.
 * This uses ElevenLabs' native Twilio integration — no custom webhooks needed.
 */
export async function registerPhoneNumber(
  phoneNumber: string,
  agentId: string,
  twilioAccountSid: string,
  twilioAuthToken: string,
  label?: string
): Promise<{ phone_number_id: string }> {
  return apiRequest<{ phone_number_id: string }>("/convai/phone-numbers/create", {
    method: "POST",
    body: JSON.stringify({
      phone_number: phoneNumber,
      agent_id: agentId,
      provider: "twilio",
      label: label || phoneNumber,
      twilio_config: {
        account_sid: twilioAccountSid,
        auth_token: twilioAuthToken,
      },
    }),
  });
}

// ---------------------------------------------------------------------------
// Voices
// ---------------------------------------------------------------------------

/**
 * List all available voices.
 */
export async function getVoices(): Promise<Voice[]> {
  const data = await apiRequest<{ voices: Voice[] }>("/voices");
  return data.voices;
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

/**
 * Get a single conversation with full transcript/recording data.
 */
export async function getConversation(
  conversationId: string
): Promise<Conversation> {
  return apiRequest<Conversation>(
    `/convai/conversations/${conversationId}`
  );
}

/**
 * List conversations for a specific agent.
 */
export async function getAgentConversations(
  agentId: string
): Promise<ConversationSummary[]> {
  const data = await apiRequest<{ conversations: ConversationSummary[] }>(
    `/convai/conversations?agent_id=${agentId}`
  );
  return data.conversations;
}
