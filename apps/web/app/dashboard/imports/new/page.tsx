import { PageHeader } from "@/components/layout/page-header";
import { ImportWizard } from "@/components/imports/import-wizard";

export default function NewImportPage() {
  return (
    <>
      <PageHeader
        title="New Import"
        description="Upload and process a customs CSV file."
      />
      <ImportWizard />
    </>
  );
}
