import type { Metadata } from "next";
import { ROUTE_TITLE } from "../_state/routes";
import Screen from "./screen";

export const metadata: Metadata = { title: `Fluid — ${ROUTE_TITLE["logo-export"]}` };

export default function Page() {
  return <Screen />;
}
