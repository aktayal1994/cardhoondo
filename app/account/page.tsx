import type { Metadata } from "next";
import AccountClient from "../../components/AccountClient";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return <AccountClient />;
}
