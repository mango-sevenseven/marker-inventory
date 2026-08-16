export function calculateRemainingDays(dueDate: string, today: string) {
  if (!dueDate) return null;
  const parse = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((parse(dueDate) - parse(today)) / 86_400_000);
}
