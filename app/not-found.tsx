import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center bg-[#0f3d24] p-6 text-center text-white">
      <p className="text-8xl font-bold tracking-tight opacity-90">404</p>
      <h1 className="mt-4 text-2xl font-semibold leading-snug">
        Looks like this page took a sick day 🏥
      </h1>
      <p className="mt-2 text-sm text-white/80">
        The page you are looking for does not exist or was moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-12 min-w-[200px] items-center justify-center rounded-lg bg-white px-6 text-sm font-medium text-[#0f3d24] transition-colors hover:bg-white/90"
      >
        Go back home
      </Link>
    </main>
  );
}
