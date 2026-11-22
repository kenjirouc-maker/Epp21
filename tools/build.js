/* usage: node build.js <source.html> <out.min.html> [out.packed.html]
   minifies CSS, JS and HTML; optionally writes a self-extracting deflate-compressed build */
const fs=require('fs'),zlib=require('zlib'),postcss=require('postcss'),zopfli=require('@gfx/zopfli'),{minify}=require('terser'),CleanCSS=require('clean-css'),{minify:hmin}=require('html-minifier-terser');
(async()=>{const args=process.argv.slice(2),flags=args.filter(a=>a.startsWith('--')),[src,out,packed]=args.filter(a=>!a.startsWith('--')),NOMANGLE=flags.includes('--nomangle'),VERBOSE=flags.includes('--verbose');let h=fs.readFileSync(src,'utf8');const before=Buffer.byteLength(h);
 const styles=[],scripts=[];
 h=h.replace(/<style([^>]*)>([\s\S]*?)<\/style>/g,(m,a,css)=>{styles.push(css);return `<style${a}>@@S${styles.length-1}@@</style>`});
 h=h.replace(/<script([^>]*)>([\s\S]*?)<\/script>/g,(m,a,js)=>{scripts.push(js);return `<script${a}>@@J${scripts.length-1}@@</script>`});
 const docText=(h+scripts.join('\n')).toLowerCase(),purged=[];
 function purge(css){const root=postcss.parse(css);root.walkRules(rule=>{const p=rule.parent;if(p&&p.type==='atrule'&&/keyframes$/.test(p.name))return;const keep=rule.selectors.filter(sel=>[...sel.matchAll(/[.#]([A-Za-z_][\w-]*)/g)].every(m=>docText.includes(m[1].toLowerCase())));if(!keep.length){purged.push(rule.selector);rule.remove()}else if(keep.length<rule.selectors.length)rule.selectors=keep});
  root.walkAtRules(/keyframes$/,a=>{const nm=a.params.toLowerCase(),uses=(css.toLowerCase().split(nm).length-1)+(docText.split(nm).length-1);if(uses<2){purged.push('@keyframes '+a.params);a.remove()}});return root.toString()}
 const css=styles.map(c=>{c=purge(c);const r=new CleanCSS({level:2,inline:false}).minify(c);if(r.errors.length)throw new Error(r.errors.join());return r.styles});
 const js=[];for(const j of scripts){const r=await minify(j,{ecma:2020,toplevel:true,compress:{passes:3,ecma:2020,toplevel:true,keep_fargs:false,hoist_funs:true,pure_getters:'strict'},mangle:NOMANGLE?false:{toplevel:true},format:{comments:false,ecma:2020}});if(!r.code)throw new Error('terser failed');js.push(r.code)}
 h=await hmin(h,{collapseWhitespace:true,conservativeCollapse:true,removeComments:true,collapseBooleanAttributes:true,removeRedundantAttributes:true,removeEmptyAttributes:false,removeAttributeQuotes:true,minifyCSS:false,minifyJS:false,keepClosingSlash:false,decodeEntities:false});
 h=h.replace(/@@S(\d+)@@/g,(m,i)=>css[i]).replace(/@@J(\d+)@@/g,(m,i)=>js[i].replace(/<\/script/gi,'<\\/script'));
 if(VERBOSE)console.log('purged css rules:',purged.length,purged.slice(0,60).join(' | '));
 fs.writeFileSync(out,h);const min=Buffer.byteLength(h);
 console.log('source',before,'-> minified',min,`(${(100-min/before*100).toFixed(1)}% smaller)`,'gzip',zlib.gzipSync(h,{level:9}).length);
 if(packed){const z=await zopfli.deflateAsync(Buffer.from(h),{numiterations:15}),b64=Buffer.from(z).toString('base64');
  const w=`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><title>IDK</title><body style=margin:0;background:#1d1b18><script>(async()=>{try{const b=atob("${b64}"),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);const t=await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();document.open();document.write(t);document.close()}catch(e){document.body.innerHTML="This browser cannot open the packed build. Use the normal file."}})()</script>`;
  fs.writeFileSync(packed,w);console.log('packed',Buffer.byteLength(w),`(${(100-Buffer.byteLength(w)/before*100).toFixed(1)}% smaller than source)`)}})().catch(e=>{console.error('BUILD FAILED',e);process.exit(1)});
