import type {NextConfig} from 'next';
import mapping from './data/legacy-entry-map.json';
const nextConfig:NextConfig={
 poweredByHeader:false,
 turbopack:{root:process.cwd()},
 async headers(){return [{source:'/(.*)',headers:[
 {key:'X-Content-Type-Options',value:'nosniff'},{key:'X-Frame-Options',value:'DENY'},
 {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
 {key:'Strict-Transport-Security',value:'max-age=31536000; includeSubDomains; preload'},
 {key:'Permissions-Policy',value:'geolocation=(), camera=(), microphone=(), payment=()'}]},
 {source:'/content/:version([a-f0-9]{16})/:path*',headers:[{key:'Cache-Control',value:'public, max-age=31536000, immutable'}]},
 {source:'/sw.js',headers:[{key:'Cache-Control',value:'no-cache'}]},
 ...['/today','/study','/progress','/settings','/start'].map(source=>({source,headers:[{key:'X-Robots-Tag',value:'noindex, nofollow'}]}))];},
 async redirects(){return [
 ...Object.entries(mapping).map(([oldId,newId])=>({source:`/word/${oldId}`,destination:`/learn/${newId}`,permanent:true})),
 ...[['/app','/today'],['/words','/learn'],['/coverage','/progress'],['/names','/collections/names'],['/verse/:surah/:ayah','/read/:surah/:ayah'],['/search','/read?mode=transliteration'],['/tadabbur/:surah/:ayah','/insights/:surah/:ayah'],['/tadabbur/:surah','/insights/:surah'],['/tadabbur','/insights'],['/word/:id','/learn?notice=legacy-entry'],['/drill','/practice?mode=listening'],['/quiz','/practice?mode=meaning'],['/mutashabihat','/insights/practice']].map(([source,destination])=>({source:source!,destination:destination!,permanent:true}))];}
};
export default nextConfig;
