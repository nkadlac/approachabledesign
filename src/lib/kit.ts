// Kit.com (ConvertKit) API utility
// Fetches subscriber count at build time

const KIT_API_SECRET = import.meta.env.KIT_API_SECRET;

export async function getSubscriberCount(): Promise<number> {
  // Fallback if no API key is configured
  if (!KIT_API_SECRET) {
    console.warn('KIT_API_SECRET not configured, using fallback subscriber count');
    return 4600;
  }

  try {
    const response = await fetch(
      `https://api.convertkit.com/v3/subscribers?api_secret=${KIT_API_SECRET}`
    );

    if (!response.ok) {
      console.error('Kit API error:', response.status);
      return 4600;
    }

    const data = await response.json();
    return data.total_subscribers || 4600;
  } catch (error) {
    console.error('Failed to fetch subscriber count:', error);
    return 4600;
  }
}

export function formatSubscriberCount(count: number): string {
  return count.toLocaleString();
}
