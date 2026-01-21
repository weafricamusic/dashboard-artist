import "server-only";

type GenerateAgoraTokenInput = {
  channelName: string;
  uid: string;
};

export function generateAgoraToken(input: GenerateAgoraTokenInput): string {
  // TODO: Replace with real Agora token generation.
  // This stub keeps the API surface stable while wiring in the backend.
  const now = Date.now();
  return `demo-token:${input.channelName}:${input.uid}:${now}`;
}
