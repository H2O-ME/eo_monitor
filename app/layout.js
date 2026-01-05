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
    <html lang="zh-CN">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <script dangerouslySetInnerHTML={{ __html: `
          if (typeof Promise.withResolvers === 'undefined') {
            Promise.withResolvers = function() {
              let resolve, reject;
              const promise = new Promise((res, rej) => {
                resolve = res;
                reject = rej;
              });
              return { promise, resolve, reject };
            };
          }
          if (!Array.prototype.at) {
            Array.prototype.at = function(n) {
              n = Math.trunc(n) || 0;
              if (n < 0) n += this.length;
              if (n < 0 || n >= this.length) return undefined;
              return this[n];
            };
          }
          if (!Object.hasOwn) {
            Object.hasOwn = function(obj, prop) {
              return Object.prototype.hasOwnProperty.call(obj, prop);
            };
          }
        `}} />
      </head>
      <body className="bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-300">
        <noscript>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1>请启用 JavaScript 以运行此应用</h1>
          </div>
        </noscript>
        {children}
      </body>
    </html>
  );
}
