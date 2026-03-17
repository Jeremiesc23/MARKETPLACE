//app/dashboard/admin/page.tsx
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Control Panel</h1>
        <p className="text-sm text-muted-foreground">
          Administración centralizada de sitios, categorías y fields.
        </p>
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Sitios</CardTitle>
            <CardDescription>
              Lista sitios, crea tenants y administra su configuración.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/dashboard/admin/sites">Ver sitios</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/admin/sites/new">Crear sitio</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categorías</CardTitle>
            <CardDescription>
              Administra categorías por vertical y abre los fields asignados.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/dashboard/admin/categories">Ver categorías</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fields</CardTitle>
            <CardDescription>
              Gestiona fields por vertical y aplícalos a todas las categorías.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/dashboard/admin/fields">Ver fields</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}