import './globals.css';

export const metadata = {
  title: 'EdgeOne 监控大屏',
  description: 'EdgeOne 站点流量与请求量分析',
  icons: {
    icon: 'https://image.tianhw.top/avatar.webp',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}
