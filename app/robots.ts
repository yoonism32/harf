import type {MetadataRoute} from 'next';
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:'*',allow:'/',disallow:['/today','/study','/progress','/settings','/start']},sitemap:'https://harf.app/sitemap.xml'};}
