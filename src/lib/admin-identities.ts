export const ADMIN_IDENTITIES = [
  { name: "Abdal", position: "Admin utama" },
  { name: "Inayah Dzil Izzati", position: "Bendahara" },
  { name: "Tasya Ulfa", position: "Sekretaris" },
  { name: "Ahlul Fajrul Maulana", position: "Komting" },
] as const;

export function findAdminIdentity(name: string) {
  return ADMIN_IDENTITIES.find(
    (identity) => identity.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase()
  );
}
