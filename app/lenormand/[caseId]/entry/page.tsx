import dynamic from "next/dynamic";

const LenormandEntryClient = dynamic(
  () => import("./LenormandEntryClient").then((m) => m.LenormandEntryClient),
  { ssr: false }
);

export default function LenormandEntryPage() {
  return <LenormandEntryClient />;
}
