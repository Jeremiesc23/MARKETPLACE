// app/dashboard/listings/[id]/edit/page.tsx
import EditListingFormPage from "./ui";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditListingPage({ params }: PageProps) {
  const { id } = await params;
  return <EditListingFormPage id={id} />;
}