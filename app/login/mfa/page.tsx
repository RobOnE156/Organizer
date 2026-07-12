import MfaForm from "./MfaForm";

export const dynamic = "force-dynamic";

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return (
    <main className="authwrap">
      <MfaForm inviteCode={code ?? ""} />
    </main>
  );
}
