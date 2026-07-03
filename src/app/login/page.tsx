import AuthForm from "@/components/AuthForm";
import { login } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <AuthForm
      mode="login"
      action={login}
      message={params.message ?? null}
    />
  );
}
