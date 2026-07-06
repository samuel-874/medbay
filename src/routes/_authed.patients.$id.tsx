import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/patients/$id")({
  component: PatientLayout,
});

function PatientLayout() {
  return <Outlet />;
}
