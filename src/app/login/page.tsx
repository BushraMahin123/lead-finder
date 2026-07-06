import AuthForm from "@/components/AuthForm";
import { login } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ message?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <AuthForm
      action={login}
      message={params.message ?? null}
      next={params.next ?? null}
    />
  );
}
