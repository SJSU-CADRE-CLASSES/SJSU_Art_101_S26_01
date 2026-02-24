// —— Edit your data here ——
// Sleep & screen in HOURS; workout in HOURS.
// screenBreakdown: per-device app usage. Use iPhone, iPad, MacBook.
// Each device has { appName: hours } — we'll show total time and most-used app.
window.TRACKING_DATA = [
    { date: "2026-01-25", sleep: 7.9, workout: 1, screen: 5.8, screenBreakdown: { iPhone: { Instagram: 1.2, Messages: 0.8, YouTube: 0.5, TikTok: 0.5 }, iPad: { YouTube: 0.5 }, MacBook: { Chrome: 1.8, YouTube: 0.5 } } },
    { date: "2026-01-26", sleep: 7.1, workout: 0.65, screen: 6.2, screenBreakdown: { iPhone: { Instagram: 1.5, YouTube: 1, TikTok: 0.7 }, iPad: { YouTube: 0.5 }, MacBook: { Chrome: 2, YouTube: 0.5 } } },
    { date: "2026-01-27", sleep: 8.03, workout: 0.68, screen: 5.5, screenBreakdown: { iPhone: { Instagram: 1, Messages: 0.5, Chrome: 0.5 }, iPad: { Netflix: 0.5 }, MacBook: { Chrome: 2.5 } } },
    { date: "2026-01-28", sleep: 7.53, workout: 0.62, screen: 4.8, screenBreakdown: { iPhone: { Messages: 0.5, Safari: 0.5 }, iPad: { YouTube: 0.5 }, MacBook: { Chrome: 2.5, YouTube: 0.3 } } },
    { date: "2026-01-29", sleep: 7.93, workout: 0, screen: 6.5, screenBreakdown: { iPhone: { TikTok: 2, Instagram: 1.5 }, iPad: { YouTube: 0.5 }, MacBook: { Chrome: 1, YouTube: 1 } } },
    { date: "2026-01-30", sleep: 0, workout: 0, screen: 5, screenBreakdown: { iPhone: { Safari: 0.5, Messages: 0.5 }, iPad: {}, MacBook: { Chrome: 3, Netflix: 0.5 } } },
    { date: "2026-01-31", sleep: 0, workout: 0, screen: 6, screenBreakdown: { iPhone: { Instagram: 1.5, YouTube: 1, TikTok: 0.5 }, iPad: { YouTube: 0.5 }, MacBook: { Chrome: 2, YouTube: 0.5 } } },
    { date: "2026-02-01", sleep: 0, workout: 0, screen: 5.2, screenBreakdown: { iPhone: { Instagram: 1.2, YouTube: 1 }, iPad: { YouTube: 0.5 }, MacBook: { Chrome: 2.5 } } },
    { date: "2026-02-02", sleep: 7.2, workout: 0.57, screen: 5.5, screenBreakdown: { iPhone: { Instagram: 2, Messages: 0.5 }, iPad: { YouTube: 0.5 }, MacBook: { Chrome: 1.5, YouTube: 1 } } },
    { date: "2026-02-03", sleep: 7.95, workout: 0.68, screen: 4.8, screenBreakdown: { iPhone: { Safari: 0.5 }, iPad: {}, MacBook: { Chrome: 2.5, Netflix: 0.8 } } },
    { date: "2026-02-04", sleep: 6.2, workout: 0.6, screen: 6.2, screenBreakdown: { iPhone: { TikTok: 1.5, Instagram: 2 }, iPad: { YouTube: 0.5 }, MacBook: { Chrome: 1.2, YouTube: 0.5 } } },
    { date: "2026-02-05", sleep: 7.68, workout: 0, screen: 5.8, screenBreakdown: { iPhone: { Instagram: 1.5, YouTube: 0.5 }, iPad: { YouTube: 0.5 }, MacBook: { Chrome: 2.5, YouTube: 0.3 } } },
    { date: "2026-02-06", sleep: 7.82, workout: 0, screen: 5, screenBreakdown: { iPhone: { Safari: 0.5, Messages: 0.5 }, iPad: { YouTube: 0.5 }, MacBook: { Chrome: 2.5, YouTube: 1 } } },
    { date: "2026-02-07", sleep: 6.68, workout: 0, screen: 4.5, screenBreakdown: { iPhone: { Messages: 0.5 }, iPad: {}, MacBook: { Chrome: 2.5, Netflix: 1 } } },
    { date: "2026-02-08", sleep: 0, workout: 0, screen: 5.5, screenBreakdown: { iPhone: { Instagram: 2, YouTube: 0.5 }, iPad: { YouTube: 0.5 }, MacBook: { Chrome: 1.5, YouTube: 1 } } },
    { date: "2026-02-09", sleep: 7.52, workout: 0.58, screen: 5.2, screenBreakdown: { iPhone: { Instagram: 1.2, Chrome: 0.5 }, iPad: { YouTube: 0.5 }, MacBook: { Chrome: 2.5, YouTube: 0.5 } } }
];

window.toHrsMins = function(dec) {
    const h = Math.floor(dec);
    const m = Math.round((dec - h) * 60);
    if (h === 0 && m === 0) return '0h';
    if (h === 0) return m + 'm';
    if (m === 0) return h + 'h';
    return h + 'h ' + m + 'm';
};
