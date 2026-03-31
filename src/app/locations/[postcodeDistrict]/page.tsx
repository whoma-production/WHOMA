import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ postcodeDistrict: string }>;
}

export const dynamic = "force-dynamic";

export async function generateStaticParams(): Promise<Array<{ postcodeDistrict: string }>> {
  return [];
}

export async function generateMetadata({ params }: PageProps): Promise<{ title: string }> {
  const { postcodeDistrict } = await params;
  return {
    title: `Redirecting to /requests/${postcodeDistrict}`
  };
}

export default async function LegacyLocationPage({ params }: PageProps): Promise<never> {
  const { postcodeDistrict } = await params;
  const targetPath = `/requests/${encodeURIComponent(postcodeDistrict)}` as `/requests/${string}`;
  redirect(targetPath);
}
