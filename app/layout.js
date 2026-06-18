import './globals.css';

export const metadata = {
  title: 'Family Chores',
  description: 'Daily rotating chores for the whole family',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/tabler-icons/3.26.0/tabler-icons.min.css"
        />
        {children}
      </body>
    </html>
  );
}
