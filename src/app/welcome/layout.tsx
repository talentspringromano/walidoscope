export default function WelcomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="w-screen">{children}</div>;
}
