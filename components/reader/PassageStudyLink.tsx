'use client';

import Link from 'next/link';
import {usePathname, useSearchParams} from 'next/navigation';

export function PassageStudyLink({reference}: {reference: string}) {
 const pathname = usePathname();
 const params = useSearchParams();
 const back = pathname + (params.size ? `?${params}` : '');
 return <Link className="button button-secondary" href={`/read/${reference.replace(':', '/')}/study?back=${encodeURIComponent(back)}`}>Study this passage</Link>;
}
