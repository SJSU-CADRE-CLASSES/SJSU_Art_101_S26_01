/**
 * Discord-style data for Data Self Portrait.
 * Replace with your own data from Discord: User Settings → Privacy & Safety → Request a copy of your data.
 * Export comes as ZIP; you can parse messages and paste into this structure.
 */
const discordPortrait = {
  userName: "Duc Tran",
  requestDate: "2025-02-10",
  // Messages per month (replace with your real counts from export)
  messagesByMonth: [
    { month: "2024-08", count: 120 },
    { month: "2024-09", count: 340 },
    { month: "2024-10", count: 280 },
    { month: "2024-11", count: 410 },
    { month: "2024-12", count: 390 },
    { month: "2025-01", count: 520 },
    { month: "2025-02", count: 180 }
  ],
  // Activity by day of week (0 = Sunday, 6 = Saturday)
  messagesByDayOfWeek: [
    { day: "Sun", count: 95 },
    { day: "Mon", count: 140 },
    { day: "Tue", count: 165 },
    { day: "Wed", count: 130 },
    { day: "Thu", count: 200 },
    { day: "Fri", count: 310 },
    { day: "Sat", count: 280 }
  ],
  // Servers / channels (replace with your server names and counts)
  servers: [
    { name: "SJSU Art 101", messageCount: 420 },
    { name: "Gaming Squad", messageCount: 890 },
    { name: "Music & Films", messageCount: 210 },
    { name: "Study Group", messageCount: 340 },
    { name: "Friends", messageCount: 650 }
  ],
  // Word frequency (top words from your messages — replace with real data)
  topWords: [
    { word: "hey", count: 156 },
    { word: "thanks", count: 98 },
    { word: "lol", count: 87 },
    { word: "yeah", count: 82 },
    { word: "game", count: 71 },
    { word: "art", count: 64 },
    { word: "project", count: 58 },
    { word: "tomorrow", count: 52 },
    { word: "cool", count: 48 },
    { word: "nice", count: 44 }
  ],
  // Short narrative stats
  totalMessages: 2240,
  totalServers: 5,
  activeSince: "2024-08"
};
