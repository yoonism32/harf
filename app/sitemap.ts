import type {MetadataRoute} from 'next';
import {readCatalog} from '@/lib/content/server';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{const catalog=await readCatalog();const paths=catalog.releaseReady?['','/learn','/practice','/read','/insights','/insights/practice','/sources','/collections/names',...catalog.entries.map(e=>`/learn/${e.id}`)]:['','/sources'];return paths.map(path=>({url:`https://harf.app${path}`}));}
