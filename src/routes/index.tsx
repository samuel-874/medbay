import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    try {
      const hasToken = Object.keys(localStorage).some(
        (key) => key.startsWith("sb-") && key.endsWith("-auth-token"),
      );
      if (hasToken) throw redirect({ to: "/dashboard" });
    } catch (e) {
      if (e && typeof e === "object" && "to" in (e as object)) throw e;
    }
    throw redirect({ to: "/login" });
  },
  component: () => null,
});
