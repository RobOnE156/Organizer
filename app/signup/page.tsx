import SignupForm from "./SignupForm";

export const dynamic = "force-dynamic";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return (
    <main className="authwrap">
      <SignupForm code={code ?? ""} />
    </main>
  );
}
