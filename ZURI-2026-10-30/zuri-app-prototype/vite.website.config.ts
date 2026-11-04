import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The website edition uses the canonical app; the mobile preview stays separate.
export default defineConfig({
 base:'/zuri-app/',
 define:{'import.meta.env.VITE_ZURI_API_BASE':JSON.stringify('/api')},
 build:{outDir:'dist-website',emptyOutDir:true},
 plugins:[react(),tailwindcss(),{
  name:'zuri-website-edition',enforce:'pre',
  transform(code,id){
   if(!id.replaceAll('\\','/').includes('/src/'))return;
   if(/\.(tsx?|css)$/.test(id)){
    code=code.replace(/(["'`])\/(brand\/|lounge-wallpaper\.svg)/g,'$1/zuri-app/$2');
    if(id.replaceAll('\\','/').endsWith('/experience/Experience.tsx'))code=code.replace("const STORAGE = 'zuri-experience-v2'","const STORAGE = 'zuri-web-app-v1'");
    if(id.replaceAll('\\','/').endsWith('/src/main.tsx')){
     code=code.replace('import.meta.env.PROD &&','import.meta.env.PROD && import.meta.env.MODE !== "website" &&');
     code+='\nimport "./experience/web-materials.css";\nimport "./experience/website-layout.css";';
    }
    return code;
   }
  },
  transformIndexHtml:{order:'pre',handler(html){return html.replace('<!-- figma:lang -->','en').replace('<!-- figma:title -->','ZURI — Your workspace');}},
 }],
});
