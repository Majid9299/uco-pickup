import { GENERATORS } from "@/lib/mock-data";
import { ScanPageClient } from "./page-client";

export function generateStaticParams() {
  return GENERATORS.map((g) => ({ generatorId: g.id }));
}

export default async function ScanPage({
  params,
}: {
  params: Promise<{ generatorId: string }>;
}) {
  const { generatorId } = await params;
  return <ScanPageClient generatorId={generatorId} />;
}
