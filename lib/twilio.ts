import Twilio from "twilio";

let twilioClient: Twilio.Twilio | null = null;

/**
 * Returns a singleton Twilio client instance.
 */
export function getTwilioClient(): Twilio.Twilio {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error(
        "Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN environment variables"
      );
    }

    twilioClient = Twilio(accountSid, authToken);
  }

  return twilioClient;
}

export interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string;
  region: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
}

/**
 * Search for available phone numbers to purchase.
 */
export async function searchAvailableNumbers(
  countryCode: string,
  areaCode?: string
): Promise<AvailableNumber[]> {
  const client = getTwilioClient();

  const params: Record<string, string | number | boolean> = {
    voiceEnabled: true,
    limit: 20,
  };

  if (areaCode) {
    params.areaCode = areaCode;
  }

  const numbers = await client
    .availablePhoneNumbers(countryCode)
    .local.list(params);

  return numbers.map((n) => ({
    phoneNumber: n.phoneNumber,
    friendlyName: n.friendlyName,
    locality: n.locality,
    region: n.region,
    capabilities: {
      voice: n.capabilities.voice,
      sms: n.capabilities.sms,
      mms: n.capabilities.mms,
    },
  }));
}

/**
 * Provision (purchase) a phone number and configure its webhook.
 */
export async function provisionNumber(
  phoneNumber: string,
  webhookUrl: string
): Promise<{ sid: string; phoneNumber: string }> {
  const client = getTwilioClient();

  const incoming = await client.incomingPhoneNumbers.create({
    phoneNumber,
    voiceUrl: webhookUrl,
    voiceMethod: "POST",
    statusCallback: `${webhookUrl}/status`,
    statusCallbackMethod: "POST",
  });

  return {
    sid: incoming.sid,
    phoneNumber: incoming.phoneNumber,
  };
}

/**
 * Release (delete) a provisioned phone number.
 */
export async function releaseNumber(phoneSid: string): Promise<boolean> {
  const client = getTwilioClient();

  await client.incomingPhoneNumbers(phoneSid).remove();

  return true;
}
