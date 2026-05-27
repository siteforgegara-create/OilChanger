export type CatalogDuplicateCandidate = {
  id: string;
  engineCode: string | null;
  generation: string | null;
  make: string;
  model: string;
  yearFrom: number | null;
  yearTo: number | null;
};

export type VehicleDuplicateCandidate = {
  id: string;
  make: string;
  model: string;
  plateNormalized: string | null;
  vinNormalized: string | null;
  year: number | null;
};

export type DuplicateGroup<T> = {
  key: string;
  records: T[];
};

export function findDuplicateCatalogGroups(candidates: readonly CatalogDuplicateCandidate[]): Array<DuplicateGroup<CatalogDuplicateCandidate>> {
  return duplicateGroupsBy(candidates, catalogDuplicateKey);
}

export function findDuplicatePlateGroups(candidates: readonly VehicleDuplicateCandidate[]): Array<DuplicateGroup<VehicleDuplicateCandidate>> {
  return duplicateGroupsBy(
    candidates.filter((candidate) => candidate.plateNormalized && !candidate.vinNormalized),
    (candidate) => candidate.plateNormalized ?? "",
  );
}

export function maskVehicleIdentity(value: string | null): string {
  if (!value) {
    return "";
  }

  if (value.length <= 4) {
    return value;
  }

  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function duplicateGroupsBy<T>(items: readonly T[], keyFactory: (item: T) => string): Array<DuplicateGroup<T>> {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = keyFactory(item);
    const current = groups.get(key) ?? [];
    current.push(item);
    groups.set(key, current);
  }

  return Array.from(groups.entries())
    .filter(([, records]) => records.length > 1)
    .map(([key, records]) => ({ key, records }));
}

function catalogDuplicateKey(candidate: CatalogDuplicateCandidate): string {
  return [
    candidate.make.trim().toLowerCase(),
    candidate.model.trim().toLowerCase(),
    candidate.generation?.trim().toLowerCase() ?? "",
    candidate.yearFrom ?? "",
    candidate.yearTo ?? "",
    candidate.engineCode?.trim().toLowerCase() ?? "",
  ].join("|");
}
