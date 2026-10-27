'use client';

import Link from 'next/link';
import {usePathname, useSearchParams} from 'next/navigation';
import type {ComponentProps} from 'react';
import {returnLabel, safeReturn} from '@/lib/navigation/return';

export function ExploreLink({href, ...props}: Omit<ComponentProps<typeof Link>, 'href'> & {href: string}) {
 const pathname = usePathname(), params = useSearchParams();
 const origin = safeReturn(params.get('returnTo')) ?? pathname + (params.size ? `?${params}` : '');
 const target = new URL(href, 'https://harf.local');
 if (safeReturn(origin)) target.searchParams.set('returnTo', origin);
 return <Link {...props} href={target.pathname + target.search + target.hash}/>;
}

export function QuickReturn() {
 const params = useSearchParams();
 const target = safeReturn(params.get('returnTo'));
 return target ? <nav className="row" aria-label="Quick return"><Link className="button button-secondary" href={target}>← {returnLabel(target)}</Link></nav> : null;
}
