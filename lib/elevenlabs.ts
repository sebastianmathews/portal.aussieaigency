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

export interface AgentConfig {
  name: string;
  voiceId: string;
  greeting: string;
  systemPrompt: string;
  webhookUrl?: string;
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
export async function createAgent(config: AgentConfig): Promise<Agent> {
  return apiRequest<Agent>("/convai/agents/create", {
    method: "POST",
    body: JSON.stringify({
      name: config.name,
      conversation_config: {
        agent: {
          prompt: {
            prompt: config.systemPrompt,
          },
          first_message: config.greeting,
          language: "en",
        },
        tts: {
          voice_id: config.voiceId,
        },
      },
      ...(config.webhookUrl && {
        platform_settings: {
          webhook: {
            url: config.webhookUrl,
          },
        },
      }),
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
    agentSection.prompt = { prompt: config.systemPrompt };
  }
  if (config.greeting) {
    agentSection.first_message = config.greeting;
  }
  if (Object.keys(agentSection).length > 0) {
    conversationConfig.agent = agentSection;
  }
  if (config.voiceId) {
    conversationConfig.tts = { voice_id: config.voiceId };
  }
  if (Object.keys(conversationConfig).length > 0) {
    body.conversation_config = conversationConfig;
  }

  if (config.webhookUrl) {
    body.platform_settings = {
      webhook: { url: config.webhookUrl },
    };
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
