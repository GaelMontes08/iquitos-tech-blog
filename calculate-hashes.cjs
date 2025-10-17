const crypto = require('crypto');

const mainCSS = `@keyframes fadeIn {
            from { 
              opacity: 0; 
              transform: translateY(10px);
            }
            to { 
              opacity: 1; 
              transform: translateY(0);
            }
          }
          
          * {
            box-sizing: border-box;
          }
          
          :root {
            font-family: 'Onest Variable', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color-scheme: dark;
          }
          
          html {
            background-color: #131313;
          }
          
          body {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            min-height: 100vh;
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.6;
          }
          
          .pt-16 { padding-top: 4rem; }
          .text-white { color: rgb(255 255 255); }
          .bg-gray-900 { background-color: rgb(17 24 39); }
          
          .adsense-hidden { display: none !important; }
          .adsense-block { display: block !important; }
          
          img, picture {
            contain: layout;
          }
          
          .group:hover .group-hover\\:scale-105,
          .group:hover .group-hover\\:scale-110 {
            transform: scale(1.05);
            will-change: transform;
          }
          
          [loading="lazy"] {
            content-visibility: auto;
          }
          
          @media (max-width: 1023px) {
            img[fetchpriority="high"] {
              transform: translateZ(0);
              will-change: auto;
            }
          }`;

// Calculate hashes for inline styles
const mainCSSHash = 'sha256-' + crypto.createHash('sha256').update(mainCSS).digest('base64');
const adsenseStyleHash = 'sha256-' + crypto.createHash('sha256').update('display: none').digest('base64');
const adsenseBlockHash = 'sha256-' + crypto.createHash('sha256').update('display:block').digest('base64');

console.log('Main CSS Hash:', mainCSSHash);
console.log('Adsense Style Hash:', adsenseStyleHash);
console.log('Adsense Block Hash:', adsenseBlockHash);