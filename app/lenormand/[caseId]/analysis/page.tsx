import dynamic from "next/dynamic";

const LenormandAnalysisClient = dynamic(
  () =>
    import("./LenormandAnalysisClient").then((m) => m.LenormandAnalysisClient),
  { ssr: false }
);

export default function LenormandAnalysisPage() {
  return <LenormandAnalysisClient />;
}
