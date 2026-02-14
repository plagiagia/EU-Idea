import Link from "next/link";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

export default function ImportsPage() {
  return (
    <>
      <PageHeader
        title="Import Files"
        description="Upload and process customs CSV files."
        actions={
          <Button asChild>
            <Link href="/dashboard/imports/new">
              <FileUp className="mr-2 h-4 w-4" />
              New Import
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="py-12 text-center">
          <FileUp className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium">Start by importing a customs file</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Upload a CSV export from your customs system to detect CBAM-scope goods.
          </p>
          <Button asChild>
            <Link href="/dashboard/imports/new">New Import</Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
