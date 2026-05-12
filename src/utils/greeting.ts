export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'শুভ সকাল';
  if (hour < 17) return 'শুভ বিকাল';
  if (hour < 20) return 'শুভ সন্ধ্যা';
  return 'শুভ রাত্রি';
}

export function getGreetingEmoji(): string {
  const hour = new Date().getHours();
  if (hour < 12) return '☀️';
  if (hour < 17) return '🌤️';
  if (hour < 20) return '🌆';
  return '🌙';
}
