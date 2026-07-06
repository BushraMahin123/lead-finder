import SignupForm from "@/components/SignupForm";
import { signup } from "./actions";

export default function SignupPage() {
  return <SignupForm action={signup} />;
}
