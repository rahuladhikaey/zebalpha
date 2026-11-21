import { redirect } from "next/navigation";

export default async function SellerSignupAliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const qs = new URLSearchParams();
  Object.entries(resolved || {}).forEach(([key, value]) => {
    if (typeof value === "string") {
      qs.set(key, value);
    } else if (Array.isArray(value) && value[0]) {
      qs.set(key, value[0]);
    }
  });
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  redirect(`/register${suffix}`);
}
