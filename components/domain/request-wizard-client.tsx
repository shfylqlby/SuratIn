"use client";

import dynamic from "next/dynamic";
import { ListSkeleton } from "@/components/ui/skeleton";

/** Wizard membaca draf dari localStorage, jadi hanya dirender di browser. */
export const RequestWizardClient = dynamic(() => import("./request-wizard").then((m) => m.RequestWizard), {
  ssr: false,
  loading: () => <ListSkeleton rows={3} />,
});
