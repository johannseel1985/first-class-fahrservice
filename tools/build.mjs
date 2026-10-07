// Creates a scoped static distribution. Production requires explicit completion.
import {readFile,mkdir,copyFile,cp,rm} from 'node:fs/promises';
const production=process.argv.includes('--production');
const cfg=JSON.parse(await readFile('release.json','utf8'));
if(production){
 const missing=Object.entries(cfg.confirmed).filter(([,v])=>v!==true).map(([k])=>k);
 if(cfg.status!=='approved'||missing.length||!cfg.production_url){console.error('Veröffentlichung gesperrt. Offene Freigaben:',missing.join(', '));process.exit(1);}
 for(const f of ['impressum.html','datenschutz.html','bildnachweise.html'])if((await readFile(f,'utf8')).includes('data-launch-blocker')){console.error('Offene Pflichtangaben in '+f);process.exit(1);}
 if(!/^https:\/\/[a-zA-Z0-9.-]+(?::\d+)?(?:\/[a-zA-Z0-9_/-]*)?\/?$/.test(cfg.production_url))throw new Error('Ungültige Produktions-URL');
}
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const f of ['index.html','impressum.html','datenschutz.html','bildnachweise.html','404.html','styles.css','script.js'])await copyFile(f,'dist/'+f);
await cp('assets/locations','dist/assets/locations',{recursive:true});
for(const f of ['favicon.svg','witalij-hansen.webp'])await copyFile('assets/'+f,'dist/assets/'+f);
if(production){
 const {writeFile}=await import('node:fs/promises');
 const url=cfg.production_url.replace(/\/$/,'')+'/';
 let html=await readFile('dist/index.html','utf8');
 html=html.replace('noindex, nofollow','index, follow').replace('</head>',`<link rel="canonical" href="${url}"><meta property="og:url" content="${url}"><meta property="og:image" content="${url}assets/locations/kurhaus.webp"><meta property="og:image:alt" content="Kurhaus Baden-Baden"></head>`);
 await writeFile('dist/index.html',html);
 await writeFile('dist/robots.txt',`User-agent: *\nAllow: /\nSitemap: ${url}sitemap.xml\n`);
 await writeFile('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${url}</loc></url></urlset>`);
}else{const {writeFile}=await import('node:fs/promises');await writeFile('dist/robots.txt','User-agent: *\nDisallow: /\n');}
console.log(production?'Produktionspaket erstellt.':'Prüffassung in dist erstellt. Nicht als geschäftlichen Start veröffentlichen.');
