/** "Royal Enfield Classic 350" -> "royal-enfield-classic-350" */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export function randomSuffix(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
