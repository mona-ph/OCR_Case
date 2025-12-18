export const metadata = {
  title: 'OCR Case',
  description: 'Paggo OCR Case',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
